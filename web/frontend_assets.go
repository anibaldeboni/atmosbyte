package web

import (
	"embed"
	"io/fs"
	"path"
	"strings"
)

//go:embed frontend_dist/**
var frontendAssets embed.FS

func frontendAssetFS() fs.FS {
	assets, err := fs.Sub(frontendAssets, "frontend_dist")
	if err != nil {
		panic("failed to initialize embedded frontend assets")
	}
	return assets
}

func cleanAssetPath(requestPath string) string {
	cleaned := path.Clean("/" + requestPath)
	return strings.TrimPrefix(cleaned, "/")
}
