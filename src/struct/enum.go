package _struct

type ResultError int

const (
	ErrorNoError ResultError = iota
	ErrorWrongHttpStatusRange
	ErrorMissingKeyValue
	ErrorIncorrectKeyValue
	ErrorUnexpectedResponse
	ErrorTimeout
	ErrorInvalidJSON
)

type ResultWarning int

const (
	WarningNoWarning ResultWarning = iota
	WarningHttpStatusNotSame
	WarningUnknownHttpStatusExpected
	WarningUnknownOutputExpected
	WarningExtraKeyValue
	WarningNoResponse
	WarningDeprecatedField
	WarningPerformanceIssue
	WarningInconsistentDataTypes
)
