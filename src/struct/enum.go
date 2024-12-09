package _struct

type ResultError int

const (
	ErrorNoError ResultError = iota
	Error
	ErrorNoContent
	ErrorWrongHttpStatusRange
	ErrorMissingKeyValue
	ErrorIncorrectKeyValue
	ErrorUnexpectedResponse
	ErrorInvalidJSON
	ErrorInvalidInputJSON
	ErrorInvalidExpectedJSON
	ErrorInvalidAPIJSON
	ErrorNetwork
	ErrorHTTP
	ErrorConnectionRefused
	ErrorBadRequest                    = 400
	ErrorUnauthorized                  = 401
	ErrorPayementRequired              = 402
	ErrorForbidden                     = 403
	ErrorNotFound                      = 404
	ErrorMethodNotAllowed              = 405
	ErrorNotAcceptable                 = 406
	ErrorProxyAuthRequired             = 407
	ErrorTimeout                       = 408
	ErrorConflict                      = 409
	ErrorGone                          = 410
	ErrorLengthRequired                = 411
	ErrorPreconditionFailed            = 412
	ErrorPayloadTooLarge               = 413
	ErrorURITooLong                    = 414
	ErrorUnsupportedMediaType          = 415
	ErrorRangeNotSatisfiable           = 416
	ErrorExpectationFailed             = 417
	ErrorTeapotImATeapot               = 418
	ErrorMisdirectedRequest            = 421
	ErrorUnprocessableEntity           = 422
	ErrorLocked                        = 423
	ErrorTooEarly                      = 425
	ErrorUpgradeRequired               = 426
	ErrorTooManyRequests               = 429
	ErrorUnavailableForLegalReasons    = 451
	ErrorInternalServerError           = 500
	ErrorNotImplemented                = 501
	ErrorBadGateway                    = 502
	ErrorServiceUnavailable            = 503
	ErrorGatewayTimeout                = 504
	ErrorHTTPVersionNotSupported       = 505
	ErrorVariantAlsoNegotiates         = 506
	ErrorInsufficientStorage           = 507
	ErrorLoopDetected                  = 508
	ErrorNotExtended                   = 510
	ErrorNetworkAuthenticationRequired = 511
)

type ResultWarning int

const (
	WarningNoWarning ResultWarning = iota
	WarningHttpStatusNotSame
	WarningUnknownHttpStatusExpected
	WarningUnknownOutputExpected
	WarningExtraKeyValue
	WarningNotSameValue
	WarningNoResponse
	WarningDeprecatedField
	WarningPerformanceIssue
	WarningInconsistentDataTypes
)
