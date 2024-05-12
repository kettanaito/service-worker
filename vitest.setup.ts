expect.extend({
  async toMatchResponse(actual, expected) {
    if (actual == null) {
      return {
        pass: false,
        message: () => 'expected response to be defined',
        expected,
        actual,
      }
    }

    // Response status equality.
    if (actual.status !== expected.status) {
      return {
        pass: false,
        message: () => 'expected response status to match',
        expected: expected.status,
        actual: actual.status,
      }
    }

    // Response headers equality.
    const actualHeaders = Object.fromEntries(actual.headers)
    const expectedHeaders = Object.fromEntries(expected.headers)
    if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
      return {
        pass: false,
        message: () => 'expected response headers to match',
        expected: expectedHeaders,
        actual: actualHeaders,
      }
    }

    // Response body equality.
    const actualBody = await actual.text()
    const expectedBody = await expected.text()
    if (actualBody !== expectedBody) {
      return {
        pass: false,
        message: () => 'expected response body to match',
        expected: expectedBody,
        actual: actualBody,
      }
    }

    return {
      pass: true,
      message: () => '',
    }
  },
})
