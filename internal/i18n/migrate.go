package i18n

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

// MigrationTool helps migrate from old hardcoded translations to file-based system
type MigrationTool struct {
	basePath string
}

// NewMigrationTool creates a new migration tool
func NewMigrationTool(basePath string) *MigrationTool {
	return &MigrationTool{
		basePath: basePath,
	}
}

// ValidateTranslations validates that all languages have the same keys
func (mt *MigrationTool) ValidateTranslations() error {
	languages := []string{"en", "zh"}
	categories := []string{
		"dashboard", "navigation", "stats", "actions", "git",
		"commit", "file", "status", "notifications", "semantic",
		"graph", "timeline", "insights", "chart", "error",
		"branch", "sidebar", "loading", "analysis", "advanced",
		"editor", "refresh", "language", "lang",
	}

	// Track keys for each category
	categoryKeys := make(map[string]map[string][]string) // category -> language -> keys

	for _, category := range categories {
		categoryKeys[category] = make(map[string][]string)
		
		for _, lang := range languages {
			filePath := filepath.Join(mt.basePath, lang, category+".json")
			
			// Check if file exists
			if _, err := os.Stat(filePath); os.IsNotExist(err) {
				fmt.Printf("Warning: Missing translation file: %s\n", filePath)
				continue
			}

			// Load and parse file
			data, err := ioutil.ReadFile(filePath)
			if err != nil {
				return fmt.Errorf("failed to read %s: %w", filePath, err)
			}

			var translations map[string]interface{}
			if err := json.Unmarshal(data, &translations); err != nil {
				return fmt.Errorf("invalid JSON in %s: %w", filePath, err)
			}

			// Extract keys (handle nested objects)
			keys := extractKeys(translations, "")
			categoryKeys[category][lang] = keys
		}
	}

	// Compare keys between languages
	for category, langKeys := range categoryKeys {
		if len(langKeys) < 2 {
			continue // Skip if not all languages present
		}

		var allKeys []string
		var firstLang string
		for lang, keys := range langKeys {
			if firstLang == "" {
				firstLang = lang
				allKeys = keys
			} else {
				missing := findMissingKeys(allKeys, keys)
				extra := findMissingKeys(keys, allKeys)
				
				if len(missing) > 0 {
					fmt.Printf("Warning: %s/%s.json missing keys: %v\n", lang, category, missing)
				}
				if len(extra) > 0 {
					fmt.Printf("Warning: %s/%s.json has extra keys: %v\n", lang, category, extra)
				}
			}
		}
	}

	return nil
}

// extractKeys recursively extracts all keys from a nested map
func extractKeys(obj map[string]interface{}, prefix string) []string {
	var keys []string
	
	for key, value := range obj {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "." + key
		}
		
		if nested, ok := value.(map[string]interface{}); ok {
			// Recursively extract from nested object
			nestedKeys := extractKeys(nested, fullKey)
			keys = append(keys, nestedKeys...)
		} else {
			keys = append(keys, fullKey)
		}
	}
	
	return keys
}

// findMissingKeys finds keys that are in slice1 but not in slice2
func findMissingKeys(slice1, slice2 []string) []string {
	set2 := make(map[string]bool)
	for _, key := range slice2 {
		set2[key] = true
	}
	
	var missing []string
	for _, key := range slice1 {
		if !set2[key] {
			missing = append(missing, key)
		}
	}
	
	return missing
}

// GenerateTranslationReport generates a report of all translations
func (mt *MigrationTool) GenerateTranslationReport() error {
	reportPath := filepath.Join(mt.basePath, "translation_report.md")
	
	var report strings.Builder
	report.WriteString("# Translation Report\n\n")
	report.WriteString("This report shows all available translations organized by category.\n\n")

	languages := []string{"en", "zh"}
	categories := []string{
		"dashboard", "navigation", "stats", "actions", "git",
		"commit", "file", "status", "notifications", "semantic",
		"graph", "timeline", "insights", "chart", "error",
		"branch", "sidebar", "loading", "analysis", "advanced",
		"editor", "refresh", "language", "lang",
	}

	for _, category := range categories {
		report.WriteString(fmt.Sprintf("## %s\n\n", strings.Title(category)))
		
		// Create table header
		report.WriteString("| Key | English | Chinese |\n")
		report.WriteString("|-----|---------|----------|\n")
		
		// Load translations for all languages
		categoryTranslations := make(map[string]map[string]string)
		var allKeys []string
		
		for _, lang := range languages {
			filePath := filepath.Join(mt.basePath, lang, category+".json")
			if data, err := ioutil.ReadFile(filePath); err == nil {
				var translations map[string]string
				if json.Unmarshal(data, &translations) == nil {
					categoryTranslations[lang] = translations
					for key := range translations {
						if !contains(allKeys, key) {
							allKeys = append(allKeys, key)
						}
					}
				}
			}
		}
		
		// Write table rows
		for _, key := range allKeys {
			en := categoryTranslations["en"][key]
			zh := categoryTranslations["zh"][key]
			report.WriteString(fmt.Sprintf("| `%s` | %s | %s |\n", key, en, zh))
		}
		
		report.WriteString("\n")
	}

	return ioutil.WriteFile(reportPath, []byte(report.String()), 0644)
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// RunMigration runs the complete migration process
func RunMigration(basePath string) error {
	mt := NewMigrationTool(basePath)
	
	fmt.Println("Starting translation validation...")
	
	// Validate translations
	if err := mt.ValidateTranslations(); err != nil {
		return fmt.Errorf("translation validation failed: %w", err)
	}
	fmt.Println("✓ Validated translations")
	
	// Generate report
	if err := mt.GenerateTranslationReport(); err != nil {
		return fmt.Errorf("failed to generate report: %w", err)
	}
	fmt.Println("✓ Generated translation report")
	
	fmt.Println("Migration completed successfully!")
	fmt.Printf("Translation files validated in: %s\n", basePath)
	fmt.Printf("Report generated: %s/translation_report.md\n", basePath)
	
	return nil
} 