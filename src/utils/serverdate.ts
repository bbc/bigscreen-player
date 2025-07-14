let offsetBetweenClientAndServerUTCInMilliseconds: number = 0

export function setOffsetBetweenClientAndServer(utcInMilliseconds: number): void {
  offsetBetweenClientAndServerUTCInMilliseconds = utcInMilliseconds
}

export default function ServerDate(init?: string | number | Date): Date {
  const clientTime = init == null ? new Date() : new Date(init)

  return new Date(clientTime.getTime() + offsetBetweenClientAndServerUTCInMilliseconds)
}

ServerDate.now = function getNow() {
  return Date.now() + offsetBetweenClientAndServerUTCInMilliseconds
}
