export function bondingScore(progress: number | undefined, isGraduated: boolean | undefined): number {
  if (isGraduated) {
    return 0;
  }
  if (typeof progress !== "number") {
    return 60;
  }
  if (progress < 5) {
    return 45;
  }
  if (progress < 35) {
    return 85;
  }
  if (progress < 80) {
    return 100;
  }
  if (progress < 100) {
    return 75;
  }
  return 0;
}
