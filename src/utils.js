class Nary extends Array {}
export const pipe = (...fns) => (...x) => fns.reduce((y, fn) => y instanceof Promise ? y.then(fn) : y instanceof Nary ? fn(...y) : fn(y), x.length > 1 ? Nary.from(x) : x[0]) // prettier-ignore
export const noopLog = (v) => (console.log(v), v);
export const handleDebug = ((debug) => ({
  noopLog: debug ? noopLog : (v) => v,
  map: (q) => (debug ? q.describe() : q),
  begin: (arr) => (debug ? arr.map(({ string }) => console.log(string)) : arr),
}))(process.env.DEBUG === "true");
export const throwErr = (e) => {
  throw Error(JSON.stringify(e));
};
export const debounce = (fn, delay = 1000) => {
  let arr = [];
  let id;
  return (obj) => {
    arr.push(obj);
    clearTimeout(id);
    id = setTimeout(() => {
      fn([...arr]);
      arr = [];
    }, delay);
  };
};
export const groupByReduce = (field) => (accumulator, row) => {
  const groupby = typeof field === "function" ? field(row) : field;
  const obj = Object.fromEntries(accumulator);
  obj[groupby] = obj[groupby] || [];
  obj[groupby].push(row);
  return Object.entries(obj);
};
export const groupBy = (data, field, { asList = false } = {}) => {
  const result = (data ?? []).reduce(groupByReduce(field), []);
  return !asList ? Object.fromEntries(result) : result;
};
export const groupByArray = (data, field) =>
  groupBy(data, field, { asList: true });
