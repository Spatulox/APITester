# LogHelper

## Description

LogHelper is a simple yet powerful Go package for managing logs in your applications. It provides functions to display log messages with different severity levels, each with its own color for better readability in the console.

## Fonctionnalités

- Automatic timestamp for each log message
- Three log levels: Error, Info, and Debug
- Message coloring for better visibility:
    - Error : Red
    - Info : White (default)
    - Debug : Green

## Example :
```go
    Log.Infos("Test")
```
or
```go
    Log.Infos(fmt.Sprintf("%v", err))
```

Same things with the other type :
```go
    Log.Error("error")
    Log.Debug("error")
```