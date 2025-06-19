import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type {
  Commit,
  Branch,
  Tag,
  Stash,
  Remote,
  FileChange,
  Repository,
  SearchResult
} from '@/lib/types';

export function useGitData() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepository, setCurrentRepository] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [uncommittedChanges, setUncommittedChanges] = useState<FileChange[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);
  const [expandedCommits, setExpandedCommits] = useState<string[]>([]);

  // Load initial data
  useEffect(() => {
    loadRepositories();
  }, []);

  // Load git data only when we have a current repository
  useEffect(() => {
    if (currentRepository) {
      loadGitData();
    } else {
      // Clear all git data when no repository is selected
      setCommits([]);
      setBranches([]);
      setTags([]);
      setStashes([]);
      setRemotes([]);
      setUncommittedChanges([]);
      setSelectedCommit(null);
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [currentRepository]);

  const loadRepositories = async () => {
    try {
      const repos = await api.getRepositories() as Repository[];
      setRepositories(repos);
      const current = repos.find((r: Repository) => r.current);
      setCurrentRepository(current || null);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  };

  const loadGitData = async () => {
    setIsLoading(true);
    try {
      // Reset UI state when loading new repository data
      setOffset(0);
      setSelectedCommit(null);
      setExpandedCommits([]);
      setExpandedFiles([]);
      
      await Promise.all([
        loadCommits(true), // Reset commits for new repository
        loadBranches(),
        loadTags(),
        loadStashes(),
        loadRemotes(),
        loadUncommittedChanges()
      ]);
    } catch (error) {
      console.error('Failed to load git data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommits = useCallback(async (resetOffset = false) => {
    setIsLoading(true);
    try {
      const limit = 50;
      const currentOffset = resetOffset ? 0 : offset;
      const newCommits = await api.getCommits(limit, currentOffset) as Commit[];
      
      if (resetOffset) {
        setCommits(newCommits);
        setOffset(limit);
      } else {
        setCommits(prev => [...prev, ...newCommits]);
        setOffset(prev => prev + limit);
      }
      
      setHasMore(newCommits.length === limit);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  const loadMoreCommits = useCallback(() => {
    if (!isLoading && hasMore) {
      loadCommits(false);
    }
  }, [isLoading, hasMore, loadCommits]);

  const loadCommitDetails = async (hash: string) => {
    try {
      const commitDetails = await api.getCommitDetails(hash) as Commit;
      setSelectedCommit(commitDetails);
    } catch (error) {
      console.error('Failed to load commit details:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await api.getBranches() as Branch[];
      setBranches(branchList);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadTags = async () => {
    try {
      const tagList = await api.getTags() as Tag[];
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadStashes = async () => {
    try {
      const stashList = await api.getStashes() as Stash[];
      setStashes(stashList);
    } catch (error) {
      console.error('Failed to load stashes:', error);
    }
  };

  const loadRemotes = async () => {
    try {
      const remoteList = await api.getRemotes() as Remote[];
      setRemotes(remoteList);
    } catch (error) {
      console.error('Failed to load remotes:', error);
    }
  };

  const loadUncommittedChanges = async () => {
    try {
      const changes = await api.getUncommittedChanges() as FileChange[];
      setUncommittedChanges(changes);
    } catch (error) {
      console.error('Failed to load uncommitted changes:', error);
    }
  };

  // Search functionality
  const search = async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    try {
      const results = await api.search(query) as SearchResult;
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Git operations
  const stageFile = async (filename: string) => {
    await api.stageFile(filename);
    await loadUncommittedChanges();
  };

  const unstageFile = async (filename: string) => {
    await api.unstageFile(filename);
    await loadUncommittedChanges();
  };

  const discardFileChanges = async (filename: string) => {
    await api.discardFileChanges(filename);
    await loadUncommittedChanges();
  };

  const createCommit = async (message: string, amend = false, signoff = false) => {
    await api.createCommit(message, { amend, signoff });
    await Promise.all([
      loadCommits(true),
      loadUncommittedChanges()
    ]);
  };

  const cherryPickCommit = async (hash: string) => {
    await api.cherryPickCommit(hash);
    await loadCommits(true);
  };

  const revertCommit = async (hash: string) => {
    await api.revertCommit(hash);
    await loadCommits(true);
  };

  const checkoutBranch = async (branchName: string) => {
    await api.checkoutBranch(branchName);
    await Promise.all([
      loadBranches(),
      loadCommits(true),
      loadUncommittedChanges()
    ]);
  };

  const createBranch = async (branchName: string, startPoint?: string) => {
    await api.createBranch(branchName, startPoint);
    await loadBranches();
  };

  const deleteBranch = async (branchName: string, force = false) => {
    await api.deleteBranch(branchName, force);
    await loadBranches();
  };

  const fetch = async (remote?: string) => {
    await api.fetch(remote);
    await Promise.all([
      loadCommits(true),
      loadBranches(),
      loadRemotes()
    ]);
  };

  const pullFromRemote = async (remote: string, branch: string) => {
    await api.pullFromRemote(remote, branch);
    await Promise.all([
      loadCommits(true),
      loadUncommittedChanges()
    ]);
  };

  const pushToRemote = async (remote: string, branch: string, force = false) => {
    await api.pushToRemote(remote, branch, force);
  };

  // UI helpers
  const toggleFileExpansion = (filename: string) => {
    setExpandedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const toggleCommitExpansion = (commitHash: string) => {
    setExpandedCommits(prev => 
      prev.includes(commitHash) 
        ? prev.filter(hash => hash !== commitHash)
        : [...prev, commitHash]
    );
  };

  const refreshData = () => {
    loadGitData();
  };

  // Repository management functions
  const addRepository = async (path: string) => {
    await api.addRepository(path);
    await loadRepositories();
  };

  const cloneRepository = async (url: string, name = '') => {
    await api.cloneRepository(url, name);
    await loadRepositories();
  };

  const removeRepository = async (path: string) => {
    await api.removeRepository(path);
    await loadRepositories();
    
    // If we removed the current repository, clear or switch to another one
    if (currentRepository && currentRepository.path === path) {
      const remainingRepos = repositories.filter(repo => repo.path !== path);
      if (remainingRepos.length > 0) {
        await switchRepository(remainingRepos[0].path);
      } else {
        await clearRepository();
      }
    }
  };

  const switchRepository = async (path: string) => {
    await api.switchRepository(path);
    
    // Clear search state when switching repositories
    setSearchQuery('');
    setSearchResults(null);
    
    // Update repositories array to mark the new current repository
    setRepositories(prev => prev.map(repo => ({
      ...repo,
      current: repo.path === path
    })));
    
    // Update current repository
    const newCurrentRepo = repositories.find(repo => repo.path === path);
    setCurrentRepository(newCurrentRepo ? { ...newCurrentRepo, current: true } : null);
    
    // Reload repositories to get updated state from backend
    await loadRepositories();
    
    // Reload all git data for the new repository
    await loadGitData();
  };

  const clearRepository = async () => {
    await api.clearRepository();
    setCurrentRepository(null);
    
    // Clear all git data
    setCommits([]);
    setBranches([]);
    setTags([]);
    setStashes([]);
    setRemotes([]);
    setUncommittedChanges([]);
    setSelectedCommit(null);
  };

  const discoverRepositories = async (maxDepth = 3) => {
    const result = await api.discoverRepositories(maxDepth) as { repositories: Repository[] };
    setRepositories(result.repositories || []);
    return result;
  };

  return {
    // State
    repositories,
    currentRepository,
    commits,
    branches,
    tags,
    stashes,
    remotes,
    uncommittedChanges,
    selectedCommit,
    searchQuery,
    searchResults,
    isLoading,
    hasMore,
    expandedFiles,
    expandedCommits,

    // Actions
    loadMoreCommits,
    loadCommitDetails,
    search,
    clearSearch,
    stageFile,
    unstageFile,
    discardFileChanges,
    createCommit,
    cherryPickCommit,
    revertCommit,
    checkoutBranch,
    createBranch,
    deleteBranch,
    fetch,
    pullFromRemote,
    pushToRemote,
    toggleFileExpansion,
    toggleCommitExpansion,
    refreshData,
    setSelectedCommit,
    
    // Repository management
    addRepository,
    cloneRepository,
    removeRepository,
    switchRepository,
    clearRepository,
    discoverRepositories
  };
} 