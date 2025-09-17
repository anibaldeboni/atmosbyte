//go:build minified
// +build minified

package web

import _ "embed"

//go:embed templates-min/index.html
var indexTemplate string

//go:embed templates-min/historical.html
var historicalTemplate string

//go:embed templates-min/404.html
var notFoundTemplate string
