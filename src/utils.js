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
