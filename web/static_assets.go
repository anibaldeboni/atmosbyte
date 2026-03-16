package web

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed static/**
var staticAssets embed.FS

func staticFileSystem() http.FileSystem {
	assets, err := fs.Sub(staticAssets, "static")
	if err != nil {
		return http.Dir("static")
	}

	return http.FS(assets)
}
