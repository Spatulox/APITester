// Enum pour les erreurs
const ResultError = {
    0: 'ErrorNoError',
    1: 'Error',
    2: 'ErrorNoContent',
    3: 'ErrorWrongHttpStatusRange',
    4: 'ErrorMissingKeyValue',
    5: 'ErrorIncorrectKeyValue',
    6: 'ErrorUnexpectedResponse',
    7: 'ErrorInvalidJSON',
    8: 'ErrorInvalidInputJSON',
    9: 'ErrorInvalidExpectedJSON',
    10: 'ErrorInvalidAPIJSON',
    11: 'ErrorNetwork',
    12: 'ErrorHTTP',
    13: 'ErrorConnectionRefused',
    14: 'ErrorExpectedOrActualOuputNotMatch',
    400: 'ErrorBadRequest',
    401: 'ErrorUnauthorized',
    402: 'ErrorPayementRequired',
    403: 'ErrorForbidden',
    404: 'ErrorNotFound',
    405: 'ErrorMethodNotAllowed',
    406: 'ErrorNotAcceptable',
    407: 'ErrorProxyAuthRequired',
    408: 'ErrorTimeout',
    409: 'ErrorConflict',
    410: 'ErrorGone',
    411: 'ErrorLengthRequired',
    412: 'ErrorPreconditionFailed',
    413: 'ErrorPayloadTooLarge',
    414: 'ErrorURITooLong',
    415: 'ErrorUnsupportedMediaType',
    416: 'ErrorRangeNotSatisfiable',
    417: 'ErrorExpectationFailed',
    418: 'ErrorTeapotImATeapot',
    421: 'ErrorMisdirectedRequest',
    422: 'ErrorUnprocessableEntity',
    423: 'ErrorLocked',
    425: 'ErrorTooEarly',
    426: 'ErrorUpgradeRequired',
    429: 'ErrorTooManyRequests',
    451: 'ErrorUnavailableForLegalReasons',
    500: 'ErrorInternalServerError',
    501: 'ErrorNotImplemented',
    502: 'ErrorBadGateway',
    503: 'ErrorServiceUnavailable',
    504: 'ErrorGatewayTimeout',
    505: 'ErrorHTTPVersionNotSupported',
    506: 'ErrorVariantAlsoNegotiates',
    507: 'ErrorInsufficientStorage',
    508: 'ErrorLoopDetected',
    510: 'ErrorNotExtended',
    511: 'ErrorNetworkAuthenticationRequired'
};

// Enum pour les avertissements
const ResultWarning = {
    0: 'WarningNoWarning',
    1: 'WarningHttpStatusNotSame',
    2: 'WarningUnknownHttpStatusExpected',
    3: 'WarningUnknownExpectedOutput',
    4: 'WarningExtraKeyValue',
    5: 'WarningNotSameValue',
    6: 'WarningNoResponse',
    7: 'WarningDeprecatedField',
    8: 'WarningPerformanceIssue',
    9: 'WarningInconsistentDataTypes',
};

// Invert the "enum" entry (name => int) instead of (int => name)
const ErrorNames = Object.fromEntries(Object.entries(ResultError).map(([key, value]) => [value, key]));
const WarningNames = Object.fromEntries(Object.entries(ResultWarning).map(([key, value]) => [value, key]));

// Get the Error name for the int value
export function getErrorName(errorCode) {
    return ResultError[errorCode] || 'Unknown Error';
}

// Get Warning name from the int value
export function getWarningName(warningCode) {
    return ResultWarning[warningCode] || 'Unknown Warning';
}

// Get the int value of the error name
export function getErrorCode(errorName) {
    return ErrorNames[errorName] !== undefined ? parseInt(ErrorNames[errorName]) : null;
}

// Get the int value of the warning value
export function getWarningCode(warningName) {
    return WarningNames[warningName] !== undefined ? parseInt(WarningNames[warningName]) : null;
}