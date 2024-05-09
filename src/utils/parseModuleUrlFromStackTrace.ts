export function parseModuleUrlFromStackTrace(error: Error): string {
  const stack = error.stack?.split('\n') || []
  const moduleFrame = stack[2]
  const [, moduleUrl] = /\((.+?)(?::\d+:\d+)?\)$/g.exec(moduleFrame) || []
  return moduleUrl
}
