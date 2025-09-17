//go:build !minified
// +build !minified

package web

import _ "embed"

//go:embed templates/index.html
var indexTemplate string

//go:embed templates/historical.html
var historicalTemplate string

//go:embed templates/404.html
var notFoundTemplate string
