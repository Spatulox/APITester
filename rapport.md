# Bug report

Two bugs found while reading the codebase. Neither has been fixed yet.

---

## 1. `removeWarning` removes every warning, not just the one asked for

**Location:** `src/checkConfig/checkConfig.go:654-666`

```go
func removeWarning(result *RequestResult, warning ResultWarning) {
	...
	newWarnings := make([]ResultWarning, 0, len(result.Warning))
	for _, warning := range result.Warning {   // shadows the parameter
		if warning != warning {                // always false
			newWarnings = append(newWarnings, warning)
		}
	}
	result.Warning = newWarnings              // always empty
}
```

**Cause:** the loop variable `warning` hides the function parameter of the same name. The condition compares the variable with itself, so it is never true. Nothing gets copied, and `result.Warning` always ends up as an empty slice.

**Impact:** `ExecuteConfig` calls `removeWarning` when it fills the expected output (lines 108-131).
- **Fill mode (`fillExpectedOutput`, not forced).** Only `WarningUnknownExpectedOutput` should be removed. Every other warning on that result is lost too, including `WarningExtraKeyValue`, `WarningHttpStatusNotSame` and `WarningNotSameValue`. The result can then show as OK in the dashboard when it should be WARNING.
- **Forced update.** The effect happens to match the intent, but by accident. It also wipes warnings that are not in the removal list, such as `WarningNoResponse` and `WarningPerformanceIssue`.

**Fix:**

```go
func removeWarning(result *RequestResult, toRemove ResultWarning) {
	if result == nil {
		return
	}
	newWarnings := make([]ResultWarning, 0, len(result.Warning))
	for _, w := range result.Warning {
		if w != toRemove {
			newWarnings = append(newWarnings, w)
		}
	}
	result.Warning = newWarnings
}
```

---

## 2. Malformed JSON tag on `Endpoint.IsAlreadyAskedToFillExpectedOutPut`

**Location:** `src/struct/struct.go:35`

```go
IsAlreadyAskedToFillExpectedOutPut string `json:isAlreadyAskedToFillExpectedOutput`
```

**Cause:** the tag value has no quotes. Go's struct tag parser rejects it, so `encoding/json` ignores the tag and falls back to the Go field name. `go vet` (structtag check) reports this.

**Impact:**
- When saved (`SaveConfigToJson`, `UpdateConfig`), the key is written as `"IsAlreadyAskedToFillExpectedOutPut"` instead of the intended `"isAlreadyAskedToFillExpectedOutput"`.
- Loading still works, because `encoding/json` matches keys case-insensitively. That is why the bug has gone unnoticed.
- The frontend currently depends on the wrong name. `frontend/src/JS/config/edit-config.js:270` reads `endpoint.IsAlreadyAskedToFillExpectedOutPut`. `save-config.js:27` writes `isAlreadyAskedToFillExpectedOutput` (the intended name), and Go reads that back without trouble.

**Fix:**

```go
IsAlreadyAskedToFillExpectedOutPut string `json:"isAlreadyAskedToFillExpectedOutput"`
```

Change `frontend/src/JS/config/edit-config.js:270` in the same commit:

```js
isAlreadyAskedSpan.textContent = endpoint.isAlreadyAskedToFillExpectedOutput;
```

Existing config files saved with the old key will still load, because the match is case-insensitive, so no migration is needed. Regenerate the Wails bindings (`wails dev` / `wails generate module`) after the change.
