# Multilingual Support System

This document describes the improved internationalization (i18n) system for GAIT, which separates translations into organized files by language and category.

## Architecture Overview

The new i18n system consists of:

1. **Separate Translation Files**: JSON files organized by language and category
2. **Translation Loader**: Go backend that loads translations from files
3. **Modern JavaScript Manager**: Client-side translation management
4. **Backward Compatibility**: Maintains compatibility with existing code

## Directory Structure

```
internal/i18n/
├── translations/
│   ├── en/                     # English translations
│   │   ├── dashboard.json
│   │   ├── navigation.json
│   │   ├── stats.json
│   │   ├── actions.json
│   │   ├── git.json
│   │   ├── commit.json
│   │   ├── file.json
│   │   ├── status.json
│   │   └── notifications.json
│   └── zh/                     # Chinese translations
│       ├── dashboard.json
│       ├── navigation.json
│       ├── stats.json
│       ├── actions.json
│       ├── git.json
│       ├── commit.json
│       ├── file.json
│       ├── status.json
│       └── notifications.json
├── i18n.go                     # Main i18n manager
├── loader.go                   # Translation file loader
└── README.md                   # This file
```

## Translation Categories

### Dashboard (`dashboard.json`)
- Dashboard titles and sections
- Repository statistics labels
- Chart and graph titles

### Navigation (`navigation.json`)
- Menu items
- Navigation buttons
- Breadcrumbs

### Statistics (`stats.json`)
- Statistical labels and metrics
- Performance indicators
- Counters and measurements

### Actions (`actions.json`)
- Button labels
- Action descriptions
- Operation names

### Git Operations (`git.json`)
- Git command labels
- Branch, tag, stash operations
- Repository management

### Commit Operations (`commit.json`)
- Commit details and metadata
- Commit actions and operations
- File change descriptions

### File Operations (`file.json`)
- File management actions
- Editor operations
- File status indicators

### Status Messages (`status.json`)
- Loading states
- Progress indicators
- Success/error messages

### Notifications (`notifications.json`)
- User notifications
- System messages
- Alerts and confirmations

## Usage

### Backend (Go)

```go
import "internal/i18n"

// Get translation
message := i18n.T("dashboard.title")

// Format with parameters
formatted := i18n.Tf("stats.commits_count", 42)

// Switch language
i18n.SetLocale(i18n.Chinese)

// Add new translation
i18n.GetInstance().AddTranslation(i18n.English, "dashboard", "new_key", "New Value")
```

### Frontend (JavaScript)

```javascript
// Get translation
const title = t('dashboard.title');

// Switch language
switchLanguage('zh');

// Use in HTML with data-i18n attribute
<button data-i18n="actions.refresh">Refresh</button>
```

## Adding New Translations

### 1. Add to Translation Files

Add the new key-value pair to the appropriate category file:

**English** (`internal/i18n/translations/en/dashboard.json`):
```json
{
  "title": "ADES Dashboard",
  "new_feature": "New Feature"
}
```

**Chinese** (`internal/i18n/translations/zh/dashboard.json`):
```json
{
  "title": "ADES 仪表板",
  "new_feature": "新功能"
}
```

### 2. Use in Code

**Backend**:
```go
title := i18n.T("dashboard.new_feature")
```

**Frontend**:
```javascript
const title = t('dashboard.new_feature');
```

**HTML**:
```html
<span data-i18n="dashboard.new_feature">New Feature</span>
```

## Adding New Languages

### 1. Create Language Directory

```bash
mkdir internal/i18n/translations/fr  # For French
```

### 2. Create Category Files

Copy the structure from existing languages and translate:

```bash
cp internal/i18n/translations/en/*.json internal/i18n/translations/fr/
```

### 3. Update Constants

Add the new locale to `internal/i18n/i18n.go`:

```go
const (
    English Locale = "en"
    Chinese Locale = "zh"
    French  Locale = "fr"  // Add new language
)
```

### 4. Update JavaScript Manager

Add the new language to `internal/web/static/js/i18n-manager.js`:

```javascript
getAvailableLanguages() {
    return ['en', 'zh', 'fr'];  // Add new language
}
```

## Migration from Old System

The new system maintains backward compatibility with the old hardcoded translations. If translation files are not found, the system falls back to the hardcoded translations in `i18n.go`.

### Migration Steps

1. **Gradual Migration**: The system works with both old and new translations
2. **Test Thoroughly**: Ensure all translations work correctly
3. **Clean Up**: Remove hardcoded translations after confirming file-based system works

## Best Practices

### 1. Consistent Naming

Use consistent naming conventions for translation keys:
- `category.specific_item`
- Use underscores for multi-word keys
- Be descriptive but concise

### 2. Organize by Context

Group related translations in the same category:
- UI elements together
- Error messages together
- Status messages together

### 3. Provide Context

Add comments in translation files when needed:

```json
{
  "// Context: This appears in the main dashboard header": "",
  "title": "ADES Dashboard",
  "// Context: Button to refresh data": "",
  "refresh": "Refresh"
}
```

### 4. Handle Pluralization

For languages with complex pluralization rules, use descriptive keys:

```json
{
  "commits_zero": "No commits",
  "commits_one": "1 commit",
  "commits_many": "%d commits"
}
```

## Development Tools

### Reload Translations

During development, you can reload translations without restarting:

**Backend**:
```go
err := i18n.GetInstance().ReloadTranslations()
```

**Frontend**:
```javascript
await i18nManager.reloadTranslations();
```

### Validation

The system includes validation to ensure:
- All translation files are valid JSON
- Required keys exist in all languages
- No missing translations

## Performance Considerations

1. **Lazy Loading**: Translations are loaded only when needed
2. **Caching**: Loaded translations are cached in memory
3. **Parallel Loading**: Multiple category files loaded simultaneously
4. **Fallback Strategy**: Fast fallback to hardcoded translations if files fail

## Troubleshooting

### Common Issues

1. **Missing Translation Files**: System falls back to hardcoded translations
2. **Invalid JSON**: Error logged, category skipped
3. **Missing Keys**: Warning logged, key returned as-is
4. **Network Issues**: JavaScript falls back to hardcoded translations

### Debug Mode

Enable debug logging to troubleshoot translation issues:

```go
// Set debug flag
os.Setenv("I18N_DEBUG", "true")
```

```javascript
// Enable console warnings
console.log("Translation debug mode enabled");
```

## Future Enhancements

1. **Translation Management UI**: Web interface for managing translations
2. **Automatic Translation**: Integration with translation services
3. **Pluralization Support**: Advanced pluralization rules
4. **RTL Support**: Right-to-left language support
5. **Translation Validation**: Automated validation tools
6. **Hot Reloading**: Real-time translation updates during development 