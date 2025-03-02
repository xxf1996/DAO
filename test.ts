const map = new WeakMap()
{
  const a = { b: 1 }
  map.set(a, 1)
  console.log(map.get(a), map)
}
console.log(map)
