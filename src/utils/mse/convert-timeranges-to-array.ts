type Range = [start: number, end: number]

export default function convertTimeRangesToArray(ranges: TimeRanges): Range[] {
  const array: Range[] = []

  for (let rangesSoFar = 0; rangesSoFar < ranges.length; rangesSoFar += 1) {
    array.push([ranges.start(rangesSoFar), ranges.end(rangesSoFar)])
  }

  return array
}
