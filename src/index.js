import { pipe, handleDebug } from "./utils.js";

export { default as onPurgeStellate } from "./stellate.connector.js";

export const clean = (sql) => async () =>
  sql
    .begin((sql) =>
      [
        sql`
        DO $$
        DECLARE
          obj record;
        BEGIN
          DROP EVENT TRIGGER IF EXISTS "cacheinvalid__create_notify_table" RESTRICT;
          DROP PROCEDURE IF EXISTS "cacheinvalid__create_notify" RESTRICT;
          DROP FUNCTION IF EXISTS "cacheinvalid__create_notify_table" RESTRICT;
          FOR obj IN
            SELECT
              table_name,
              format('cacheinvalid__notify_on_%s', x.op) as trigger_name
            FROM
              information_schema.tables, (VALUES ('insert'), ('delete'), ('update')) as x(op)
            WHERE
              table_schema = 'public'
              AND table_type = 'BASE TABLE'
          LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS %s ON %s', obj.trigger_name, obj.table_name);
          END LOOP;
          DROP FUNCTION IF EXISTS "cacheinvalid__notify" RESTRICT;
        END;
        $$
      `,
      ].map(handleDebug.map)
    )
    .then(handleDebug.begin);

export default (sql) =>
  pipe(clean(sql), () =>
    sql
      .begin((sql) =>
        [
          sql`
          CREATE OR REPLACE FUNCTION "public"."cacheinvalid__notify" ()
            RETURNS TRIGGER
            AS $$
          DECLARE
            o_table_name text := TG_TABLE_NAME::text;
            op text := TG_OP::text;
            obj record;
            need_join boolean := TG_ARGV[0]::boolean;
          BEGIN
            FOR obj IN
            SELECT
              format('SELECT pg_notify(''cacheinvalid__notify'', jsonb_build_object(''op'', %L, ''table'', %L, ''views'', %L::jsonb, ''key_fields'', jsonb_agg(jsonb_build_object(%s)))::varchar(7999)) FROM %s HAVING count(sq.*) > 0', op, o_table_name, array_to_json(ARRAY (
                    SELECT
                      u.view_name FROM information_schema.view_table_usage u
                    WHERE
                      u.table_schema NOT IN ('information_schema', 'pg_catalog')
                    AND u.table_name = o_table_name)), string_agg(format('''%1$s'', %1$s', kcu.column_name), ', '), CASE WHEN need_join THEN
                  '(SELECT * FROM ref_table2 UNION SELECT * FROM ref_table) sq'
                ELSE
                  'ref_table sq'
                END) AS x
            FROM
              information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tc ON tc.constraint_name = kcu.constraint_name
              JOIN information_schema.columns c ON c.column_name = kcu.column_name
                AND c.table_name = kcu.table_name
            WHERE
              kcu.table_schema = 'public'
              AND kcu.table_name = o_table_name
              AND tc.constraint_type = 'PRIMARY KEY'
              LOOP
                EXECUTE obj.x;
              END LOOP;
            RETURN NEW;
          END;
          $$
          LANGUAGE plpgsql;
          
        `,
          sql`    
          CREATE OR REPLACE PROCEDURE "public"."cacheinvalid__create_notify" (table_name text)
          AS $$
          DECLARE
            obj record;
            trigger_name text;
            refs text;
          BEGIN
          FOR obj IN VALUES ('INSERT'), ('UPDATE'), ('DELETE')
          LOOP
            trigger_name := format('cacheinvalid__notify_on_%s', lower(obj.column1));
            refs := (
              CASE obj.column1
              WHEN 'DELETE' THEN
                'OLD TABLE AS ref_table'
              WHEN 'INSERT' THEN
                'NEW TABLE AS ref_table'
              WHEN 'UPDATE' THEN
                'OLD TABLE AS ref_table NEW TABLE AS ref_table2'
              END);
            EXECUTE format('DROP TRIGGER IF EXISTS %1$I ON %2$I ', trigger_name, table_name);
            EXECUTE format('CREATE TRIGGER %1$I AFTER %3$s ON %2$I REFERENCING %4$s ' 
                          'FOR EACH STATEMENT EXECUTE FUNCTION "public"."cacheinvalid__notify"(%L)'
                            , trigger_name, table_name, obj.column1, refs, obj.column1 = 'UPDATE');
          END LOOP;
          END;
          $$
          LANGUAGE plpgsql;`,
          sql`
          DO $$
          DECLARE
            obj record;
          BEGIN
            FOR obj IN
            SELECT
              table_name
            FROM
              information_schema.tables
            WHERE
              table_schema = 'public'
              AND table_type = 'BASE TABLE' LOOP
                EXECUTE format('CALL cacheinvalid__create_notify(%L)', obj.table_name);
              END LOOP;
          END
          $$;
          
        `,
          sql`
          CREATE OR REPLACE FUNCTION "public"."cacheinvalid__create_notify_table" ()
            RETURNS event_trigger
            AS $$
          DECLARE
            obj record;
            table_name text;
          BEGIN
            FOR obj IN
            SELECT
              *
            FROM
              pg_event_trigger_ddl_commands ()
              LOOP
                table_name := split_part(obj.object_identity, '.', 2);
                PERFORM
                  pg_notify('cacheinvalid__notify', jsonb_pretty(jsonb_build_object('table', table_name)));
                IF obj.command_tag IN ('CREATE TABLE', 'CREATE TABLE AS') THEN
                  PERFORM
                    cacheinvalid__create_notify (table_name);
                END IF;
              END LOOP;
          END;
          $$
          LANGUAGE plpgsql;
          
        `,
          sql`
        CREATE EVENT TRIGGER "cacheinvalid__create_notify_table" ON ddl_command_end
            WHEN TAG IN (
              'CREATE TABLE','CREATE TABLE AS', 
              'REFRESH MATERIALIZED VIEW'
            )
            EXECUTE FUNCTION "public"."cacheinvalid__create_notify_table" ();`,
        ].map(handleDebug.map)
      )
      .then(handleDebug.begin)
      .then(() => ({ notifierKey: "cacheinvalid__notify" }))
  );
