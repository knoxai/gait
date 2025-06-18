package i18n

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/yaml.v2"
)

// TranslationLoader handles loading translations from separate files
type TranslationLoader struct {
	basePath     string
	translations map[Locale]map[string]string
	mutex        sync.RWMutex
}

// NewTranslationLoader creates a new translation loader
func NewTranslationLoader(basePath string) *TranslationLoader {
	return &TranslationLoader{
		basePath:     basePath,
		translations: make(map[Locale]map[string]string),
	}
}

// LoadTranslations loads all translation files from the base path
// Expected structure: basePath/lang/category.json or basePath/lang/category.yaml
func (tl *TranslationLoader) LoadTranslations() error {
	tl.mutex.Lock()
	defer tl.mutex.Unlock()

	// Initialize translation maps
	tl.translations[English] = make(map[string]string)
	tl.translations[Chinese] = make(map[string]string)

	// Load translations for each supported language
	for _, locale := range []Locale{English, Chinese} {
		langDir := filepath.Join(tl.basePath, string(locale))
		
		// Check if language directory exists
		if _, err := ioutil.ReadDir(langDir); err != nil {
			fmt.Printf("Warning: Language directory %s not found, skipping\n", langDir)
			continue
		}

		if err := tl.loadLanguageTranslations(locale, langDir); err != nil {
			return fmt.Errorf("failed to load translations for %s: %w", locale, err)
		}
	}

	return nil
}

// loadLanguageTranslations loads all translation files for a specific language
func (tl *TranslationLoader) loadLanguageTranslations(locale Locale, langDir string) error {
	files, err := ioutil.ReadDir(langDir)
	if err != nil {
		return err
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		filename := file.Name()
		ext := filepath.Ext(filename)
		
		// Only process JSON and YAML files
		if ext != ".json" && ext != ".yaml" && ext != ".yml" {
			continue
		}

		filePath := filepath.Join(langDir, filename)
		category := strings.TrimSuffix(filename, ext)

		var translations map[string]string
		if ext == ".json" {
			translations, err = tl.loadJSONFile(filePath)
		} else {
			translations, err = tl.loadYAMLFile(filePath)
		}

		if err != nil {
			return fmt.Errorf("failed to load %s: %w", filePath, err)
		}

		// Add category prefix to keys to avoid conflicts
		for key, value := range translations {
			prefixedKey := fmt.Sprintf("%s.%s", category, key)
			tl.translations[locale][prefixedKey] = value
		}
	}

	return nil
}

// loadJSONFile loads translations from a JSON file
func (tl *TranslationLoader) loadJSONFile(filePath string) (map[string]string, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var translations map[string]string
	if err := json.Unmarshal(data, &translations); err != nil {
		return nil, err
	}

	return translations, nil
}

// loadYAMLFile loads translations from a YAML file
func (tl *TranslationLoader) loadYAMLFile(filePath string) (map[string]string, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var translations map[string]string
	if err := yaml.Unmarshal(data, &translations); err != nil {
		return nil, err
	}

	return translations, nil
}

// GetTranslations returns all translations for a specific locale
func (tl *TranslationLoader) GetTranslations(locale Locale) map[string]string {
	tl.mutex.RLock()
	defer tl.mutex.RUnlock()
	
	if translations, ok := tl.translations[locale]; ok {
		// Return a copy to prevent external modification
		result := make(map[string]string)
		for k, v := range translations {
			result[k] = v
		}
		return result
	}
	
	return make(map[string]string)
}

// GetAllTranslations returns all loaded translations
func (tl *TranslationLoader) GetAllTranslations() map[Locale]map[string]string {
	tl.mutex.RLock()
	defer tl.mutex.RUnlock()
	
	// Return a deep copy to prevent external modification
	result := make(map[Locale]map[string]string)
	for locale, translations := range tl.translations {
		result[locale] = make(map[string]string)
		for k, v := range translations {
			result[locale][k] = v
		}
	}
	
	return result
}

// ReloadTranslations reloads all translation files
func (tl *TranslationLoader) ReloadTranslations() error {
	return tl.LoadTranslations()
}

// SaveTranslations saves translations back to files (useful for translation management tools)
func (tl *TranslationLoader) SaveTranslations(locale Locale, category string, translations map[string]string) error {
	tl.mutex.Lock()
	defer tl.mutex.Unlock()

	langDir := filepath.Join(tl.basePath, string(locale))
	filePath := filepath.Join(langDir, category+".json")

	// Ensure directory exists
	if err := ensureDir(langDir); err != nil {
		return err
	}

	data, err := json.MarshalIndent(translations, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(filePath, data, 0644)
}

// ensureDir creates directory if it doesn't exist
func ensureDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
} 