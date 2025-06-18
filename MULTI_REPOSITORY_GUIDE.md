# Multi-Repository Management in GAIT

GAIT now supports managing multiple Git repositories without requiring the `--repo` flag for each session. This feature allows you to add, clone, switch between, and manage multiple repositories through both API endpoints and the web interface.

## Features

### 🚀 **No More --repo Flag Required**
- Start GAIT without specifying a repository: `./gait --port 8080`
- Automatically discovers repositories in your workspace
- Persistent repository configuration

### 📁 **Repository Management**
- **Add Local Repositories**: Add existing Git repositories to GAIT's management
- **Clone Remote Repositories**: Clone GitHub, GitLab, or any Git repository directly
- **Switch Repositories**: Seamlessly switch between managed repositories
- **Auto-Discovery**: Automatically find Git repositories in your workspace
- **Persistent Storage**: Repository configurations are saved and restored

### 🌐 **Web Interface Integration**
- Repository management UI in the sidebar
- One-click repository switching
- Visual indicators for the active repository
- Repository status and information display

## API Endpoints

### Repository Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repositories` | List all managed repositories |
| `POST` | `/api/repositories/add` | Add a local repository |
| `POST` | `/api/repositories/clone` | Clone a remote repository |
| `DELETE` | `/api/repositories/remove` | Remove a repository from management |
| `POST` | `/api/repositories/discover` | Discover repositories in workspace |
| `POST` | `/api/repository/switch` | Switch to a different repository |

### API Examples

#### List Repositories
```bash
curl http://localhost:8080/api/repositories
```

#### Add Local Repository
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"path":"/path/to/your/repo"}' \
  http://localhost:8080/api/repositories/add
```

#### Clone Remote Repository
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/user/repo.git","name":"my-repo"}' \
  http://localhost:8080/api/repositories/clone
```

#### Switch Repository
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"path":"/path/to/repo"}' \
  http://localhost:8080/api/repository/switch
```

#### Discover Repositories
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"maxDepth":3}' \
  http://localhost:8080/api/repositories/discover
```

#### Remove Repository
```bash
curl -X DELETE -H "Content-Type: application/json" \
  -d '{"path":"/path/to/repo"}' \
  http://localhost:8080/api/repositories/remove
```

## Web Interface Usage

### Repository Section in Sidebar

The sidebar now includes a **Repository Management** section at the top that shows:

- **Current Repository**: Highlighted with an active indicator
- **Repository List**: All managed repositories with names and paths
- **Action Buttons**: Quick access to add, clone, discover, and refresh operations

### Repository Actions

#### Adding a Local Repository
1. Click the **➕** button in the repository section
2. Enter the path to your local Git repository
3. The repository will be added to the managed list

#### Cloning a Remote Repository
1. Click the **📥** button in the repository section
2. Enter the Git repository URL (GitHub, GitLab, etc.)
3. Optionally specify a custom name
4. The repository will be cloned to your workspace and added to management

#### Switching Repositories
1. Click on any repository in the list
2. The interface will switch to that repository
3. All Git operations will now apply to the selected repository

#### Discovering Repositories
1. Click the **🔍** button to auto-discover repositories
2. GAIT will scan your workspace for Git repositories
3. Found repositories will be automatically added to management

## Configuration and Storage

### Persistent Configuration
Repository configurations are stored in `.gait/repositories.json` in your workspace:

```json
[
  {
    "name": "gait",
    "path": "/Users/username/projects/gait"
  },
  {
    "name": "my-project",
    "path": "/Users/username/projects/my-project"
  }
]
```

### Workspace Discovery
- Default workspace: Current directory (`.`)
- Configurable with `--workspace` flag: `./gait --workspace /path/to/projects`
- Maximum discovery depth: Configurable with `--max-depth` flag

## Migration from --repo Flag

### Before (Single Repository)
```bash
# Had to specify repository each time
./gait --repo /path/to/repo1 --port 8080

# To switch repositories, had to restart with different --repo
./gait --repo /path/to/repo2 --port 8080
```

### After (Multi-Repository)
```bash
# Start once, manage multiple repositories
./gait --port 8080

# Switch repositories through web interface or API - no restarts needed!
```

## Advanced Features

### Bulk Operations
- **Import/Export**: Repository configurations can be exported and imported
- **Batch Adding**: Add multiple repositories programmatically
- **Workspace Scanning**: Recursive repository discovery with depth control

### Integration with ADES
- All ADES features work with multi-repository management
- Repository context is automatically updated when switching
- Analysis and insights are repository-specific

### Real-time Updates
- Repository list updates in real-time
- Status indicators show current repository
- Seamless switching without page reloads

## Best Practices

### Repository Organization
1. **Use Workspaces**: Organize related repositories in workspace directories
2. **Consistent Naming**: Use descriptive repository names for easy identification
3. **Regular Discovery**: Periodically run discovery to find new repositories

### Performance Considerations
1. **Limit Discovery Depth**: Use appropriate `--max-depth` to avoid scanning too deep
2. **Workspace Size**: Keep workspaces manageable for better performance
3. **Repository Count**: While there's no hard limit, consider performance with many repositories

### Security
1. **Path Validation**: All repository paths are validated before adding
2. **Git Repository Check**: Only valid Git repositories can be added
3. **Workspace Boundaries**: Discovery is limited to the specified workspace

## Troubleshooting

### Common Issues

#### Repository Not Found
- Ensure the repository path exists and is a valid Git repository
- Check that the `.git` directory is present
- Verify read permissions on the repository directory

#### Clone Failures
- Check network connectivity for remote repositories
- Verify Git credentials for private repositories
- Ensure the target directory doesn't already exist

#### Discovery Issues
- Verify workspace path exists and is accessible
- Check directory permissions
- Consider increasing `--max-depth` if repositories aren't found

### Debug Mode
Enable verbose logging to troubleshoot issues:
```bash
./gait --port 8080 --workspace . --max-depth 3 2>&1 | tee gait.log
```

## Examples and Use Cases

### Development Team Workflow
```bash
# Team lead sets up workspace
./gait --workspace /team/projects --port 8080

# Discovers all team repositories
curl -X POST -d '{"maxDepth":2}' http://localhost:8080/api/repositories/discover

# Team members can now switch between projects easily
# through the web interface
```

### Multi-Project Development
```bash
# Developer working on multiple projects
./gait --workspace ~/projects --port 8080

# Add specific repositories
curl -X POST -d '{"path":"~/projects/frontend"}' http://localhost:8080/api/repositories/add
curl -X POST -d '{"path":"~/projects/backend"}' http://localhost:8080/api/repositories/add
curl -X POST -d '{"path":"~/projects/mobile"}' http://localhost:8080/api/repositories/add

# Switch between projects as needed through web interface
```

### Repository Exploration
```bash
# Explore open source projects
mkdir ~/opensource && cd ~/opensource
./gait --workspace . --port 8080

# Clone and explore various projects
curl -X POST -d '{"url":"https://github.com/golang/go.git"}' http://localhost:8080/api/repositories/clone
curl -X POST -d '{"url":"https://github.com/microsoft/vscode.git"}' http://localhost:8080/api/repositories/clone

# Switch between projects to analyze different codebases
```

## Future Enhancements

### Planned Features
- **Repository Groups**: Organize repositories into logical groups
- **Favorites**: Mark frequently used repositories as favorites
- **Recent Repositories**: Quick access to recently viewed repositories
- **Repository Statistics**: Show repository metrics and health indicators
- **Sync Configuration**: Synchronize repository configurations across team members

### Integration Opportunities
- **IDE Integration**: Direct integration with popular IDEs
- **CI/CD Integration**: Trigger builds and deployments from GAIT
- **Team Collaboration**: Share repository configurations and insights

---

## Summary

The multi-repository management feature in GAIT eliminates the need for the `--repo` flag and provides a comprehensive solution for managing multiple Git repositories. Whether you're working on a single project or managing dozens of repositories, GAIT now adapts to your workflow and provides seamless repository switching through both web interface and API.

Key benefits:
- ✅ **No more command-line restarts** for repository switching
- ✅ **Web-based repository management** with intuitive interface  
- ✅ **Automatic repository discovery** in your workspace
- ✅ **Remote repository cloning** directly from GAIT
- ✅ **Persistent configuration** that remembers your repositories
- ✅ **API-driven** for automation and integration
- ✅ **Seamless ADES integration** with repository-aware features

Start using multi-repository management today by running GAIT without the `--repo` flag and explore the new repository management features in the web interface! 