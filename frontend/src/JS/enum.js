// Enum pour les erreurs
const ResultError = {
    0: 'ErrorNoError',
    1: 'ErrorWrongHttpStatusRange',
    2: 'ErrorMissingKeyValue',
    3: 'ErrorIncorrectKeyValue',
    4: 'ErrorUnexpectedResponse',
    5: 'ErrorTimeout',
    6: 'ErrorInvalidJSON',
};

// Enum pour les avertissements
const ResultWarning = {
    0: 'WarningNoWarning',
    1: 'WarningHttpStatusNotSame',
    2: 'WarningExtraKeyValue',
    3: 'WarningNoResponse',
    4: 'WarningDeprecatedField',
    5: 'WarningPerformanceIssue',
    6: 'WarningInconsistentDataTypes',
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