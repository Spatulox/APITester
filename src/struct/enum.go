package _struct

type ResultError int

const (
	ErrorWrongHttpStatusRange ResultError = iota
	ErrorMissingKeyValue
	ErrorIncorrectKeyValue
	ErrorUnexpectedResponse
	ErrorTimeout
	ErrorInvalidJSON
)

type ResultWarning int

const (
	WarningHttpStatusNotSame ResultWarning = iota
	WarningExtraKeyValue
	WarningDeprecatedField
	WarningPerformanceIssue
	WarningInconsistentDataTypes
)
