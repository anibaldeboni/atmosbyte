// Package timezone provides timezone detection utilities for the Atmosbyte application.
package timezone

import (
	"fmt"
	"time"
)

// GetMachineLocation returns the machine's timezone location for database queries.
func GetMachineLocation() *time.Location {
	tzLocal := time.Local
	if tzLocal != nil {
		return tzLocal
	}

	// Default to São Paulo timezone (where Atmosbyte typically runs on Raspberry Pi in Brazil)
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		// Fallback to UTC if location cannot be loaded (should rarely happen)
		fmt.Printf("Warning: Could not load America/Sao_Paulo timezone, using UTC\n")
		return time.UTC
	}

	return loc
}
