import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Folder,
  FolderPlus,
  Download,
  Search,
  X,
  Trash2,
  GitBranch,
  Tag as TagIcon,
  Archive,
  Globe,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

import type { Repository, Branch, Tag, Stash, Remote } from '@/lib/types'

interface RepositorySidebarProps {
  repositories: Repository[]
  currentRepository?: Repository
  branches: Branch[]
  tags: Tag[]
  stashes: Stash[]
  remotes: Remote[]
  isLoading?: boolean
  onAddRepository: () => void
  onCloneRepository: () => void
  onDiscoverRepositories: () => void
  onClearRepository: () => void
  onSwitchRepository: (path: string) => void
  onRemoveRepository: (path: string, name: string) => void
  onCheckoutBranch: (branchName: string) => void
  onRefresh: () => void
}

export function RepositorySidebar({
  repositories,
  currentRepository,
  branches,
  tags,
  stashes,
  remotes,
  isLoading = false,
  onAddRepository,
  onCloneRepository,
  onDiscoverRepositories,
  onClearRepository,
  onSwitchRepository,
  onRemoveRepository,
  onCheckoutBranch,
  onRefresh,
}: RepositorySidebarProps) {
  const { t } = useTranslation()
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    repositories: true,
    branches: true,
    tags: false,
    stashes: false,
    remotes: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold truncate">
            {currentRepository?.name || 'No Repository Selected'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-4">
            {/* Repositories Section */}
            <div>
              <Collapsible
                open={expandedSections.repositories}
                onOpenChange={() => toggleSection('repositories')}
              >
                <CollapsibleTrigger asChild>
                  <div className="group/label cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        REPOSITORIES ({repositories.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center opacity-0 group-hover/label:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddRepository()
                            }}
                            title="Add Repository"
                          >
                            <FolderPlus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onCloneRepository()
                            }}
                            title="Clone Repository"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDiscoverRepositories()
                            }}
                            title="Discover Repositories"
                          >
                            <Search className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onClearRepository()
                            }}
                            title="Clear Selection"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {expandedSections.repositories ? (
                          <ChevronDown className="h-3 w-3 transition-transform" />
                        ) : (
                          <ChevronRight className="h-3 w-3 transition-transform" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    {repositories.length === 0 ? (
                      <div className="p-4 text-center border border-dashed rounded-lg mx-2 my-2">
                        <Folder className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground mb-3">
                          No repositories found
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button variant="outline" size="sm" onClick={onAddRepository}>
                            <FolderPlus className="h-3 w-3 mr-1" />
                            Add Repository
                          </Button>
                          <Button variant="outline" size="sm" onClick={onCloneRepository}>
                            <Download className="h-3 w-3 mr-1" />
                            Clone Repository
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 px-2">
                        {repositories.map((repo) => (
                          <div
                            key={repo.path}
                            className={cn(
                              "group flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                              repo.current 
                                ? "bg-gradient-to-r from-blue-600/30 to-blue-500/20" 
                                : "hover:bg-accent cursor-pointer border-2 border-transparent hover:border-gray-600"
                            )}
                          >
                            <div 
                              className={cn(
                                "flex items-center space-x-3 flex-1 min-w-0",
                                !repo.current && "cursor-pointer"
                              )}
                              onClick={() => !repo.current && onSwitchRepository(repo.path)}
                            >
                              <Folder className={cn(
                                "h-5 w-5 flex-shrink-0",
                                repo.current ? "text-blue-300" : "text-muted-foreground"
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className={cn(
                                  "font-medium truncate text-sm",
                                  repo.current ? "text-blue-100 font-bold" : "text-foreground"
                                )}>
                                  {repo.name}
                                </div>
                                <div className={cn(
                                  "text-xs truncate",
                                  repo.current ? "text-blue-200" : "text-muted-foreground"
                                )}>
                                  {repo.path}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveRepository(repo.path, repo.name)}
                                className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0",
                                  repo.current ? "hover:bg-blue-700/50 text-blue-200" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                )}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Branches Section */}
            <div>
              <Collapsible
                open={expandedSections.branches}
                onOpenChange={() => toggleSection('branches')}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        BRANCHES ({branches.length})
                      </span>
                      {expandedSections.branches ? (
                        <ChevronDown className="h-3 w-3 transition-transform" />
                      ) : (
                        <ChevronRight className="h-3 w-3 transition-transform" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    {branches.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                        No branches found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1 px-2">
                          {branches.map((branch) => (
                            <div
                              key={branch.name}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                                branch.current && "bg-accent"
                              )}
                              onClick={() => !branch.current && onCheckoutBranch(branch.name)}
                            >
                              <GitBranch className="h-3 w-3" />
                              <span className="text-sm truncate flex-1">{branch.name}</span>
                              {branch.current && (
                                <Badge variant="secondary" className="text-xs">
                                  current
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Tags Section */}
            <div>
              <Collapsible
                open={expandedSections.tags}
                onOpenChange={() => toggleSection('tags')}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        TAGS ({tags.length})
                      </span>
                      {expandedSections.tags ? (
                        <ChevronDown className="h-3 w-3 transition-transform" />
                      ) : (
                        <ChevronRight className="h-3 w-3 transition-transform" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    {tags.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                        No tags found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1 px-2">
                          {tags.map((tag) => (
                            <div
                              key={tag.name}
                              className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                            >
                              <TagIcon className="h-3 w-3" />
                              <span className="text-sm truncate">{tag.name}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Stashes Section */}
            <div>
              <Collapsible
                open={expandedSections.stashes}
                onOpenChange={() => toggleSection('stashes')}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        STASHES ({stashes.length})
                      </span>
                      {expandedSections.stashes ? (
                        <ChevronDown className="h-3 w-3 transition-transform" />
                      ) : (
                        <ChevronRight className="h-3 w-3 transition-transform" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    {stashes.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                        No stashes found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1 px-2">
                          {stashes.map((stash) => (
                            <div
                              key={stash.index}
                              className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                            >
                              <Archive className="h-3 w-3" />
                              <span className="text-sm truncate">{stash.message}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Remotes Section */}
            <div>
              <Collapsible
                open={expandedSections.remotes}
                onOpenChange={() => toggleSection('remotes')}
              >
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded-md transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        REMOTES ({remotes.length})
                      </span>
                      {expandedSections.remotes ? (
                        <ChevronDown className="h-3 w-3 transition-transform" />
                      ) : (
                        <ChevronRight className="h-3 w-3 transition-transform" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2">
                    {remotes.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground text-center">
                        No remotes found
                      </div>
                    ) : (
                      <ScrollArea className="max-h-32">
                        <div className="space-y-1 px-2">
                          {remotes.map((remote) => (
                            <div
                              key={remote.name}
                              className="flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors"
                            >
                              <Globe className="h-3 w-3" />
                              <span className="text-sm truncate">{remote.name}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 