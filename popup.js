// CineKeep - Chrome Extension Logic
// Supports chrome.storage.local with localStorage fallback for easy development and offline testing

document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let library = [];
  let currentRating = 0;
  let deletedItemTemp = null; // For Undo action
  let toastTimeout = null;

  // --- Storage Helper (Chrome Storage with LocalStorage fallback) ---
  const Storage = {
    get: function(callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ cineKeepLibrary: [] }, (result) => {
          callback(result.cineKeepLibrary);
        });
      } else {
        const localData = localStorage.getItem('cineKeepLibrary');
        callback(localData ? JSON.parse(localData) : []);
      }
    },
    set: function(data, callback) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ cineKeepLibrary: data }, () => {
          if (callback) callback();
        });
      } else {
        localStorage.setItem('cineKeepLibrary', JSON.stringify(data));
        if (callback) callback();
      }
    }
  };

  // --- DOM Elements ---
  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const libraryCountBadge = document.getElementById('library-count-badge');
  const emptyStateAddBtn = document.getElementById('empty-state-add-btn');

  // Library Controls & List
  const searchInput = document.getElementById('search-input');
  const filterChips = document.querySelectorAll('.chip');
  const sortSelect = document.getElementById('sort-select');
  const libraryList = document.getElementById('library-list');
  const emptyState = document.getElementById('empty-state');

  // Form Elements
  const addForm = document.getElementById('add-form');
  const editIdInput = document.getElementById('edit-id');
  const titleInput = document.getElementById('item-title');
  const genreInput = document.getElementById('item-genre');
  const notesInput = document.getElementById('item-notes');
  const posterInput = document.getElementById('item-poster');
  const posterPreview = document.getElementById('poster-preview');
  const starsPicker = document.getElementById('stars-picker');
  const ratingLabel = document.getElementById('rating-label');
  const btnSubmit = document.getElementById('btn-submit');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const titleError = document.getElementById('title-error');

  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statMovies = document.getElementById('stat-movies');
  const statShows = document.getElementById('stat-shows');
  const statAvgRating = document.getElementById('stat-avg-rating');
  const topGenresList = document.getElementById('top-genres-list');

  // Utilities & Settings
  const btnExport = document.getElementById('btn-export');
  const btnImportTrigger = document.getElementById('btn-import-trigger');
  const importFileInput = document.getElementById('import-file-input');
  const btnReset = document.getElementById('btn-reset');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastAction = document.getElementById('toast-action');

  // --- Initial Setup ---
  init();

  function init() {
    // Load library from storage
    Storage.get((data) => {
      library = data;
      renderLibrary();
      updateStats();
    });

    setupEventListeners();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // 1. Tab Switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    emptyStateAddBtn.addEventListener('click', () => {
      switchTab('tab-add');
    });

    // 2. Library Filtering & Sorting
    searchInput.addEventListener('input', () => {
      renderLibrary();
    });

    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderLibrary();
      });
    });

    sortSelect.addEventListener('change', () => {
      renderLibrary();
    });

    // 3. Interactive Star Picker
    const starButtons = starsPicker.querySelectorAll('.star-btn');
    
    starButtons.forEach(star => {
      // Click handler
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-value'), 10);
        setRating(rating);
      });

      // Hover simulation
      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        highlightStars(val);
        updateRatingLabel(val, true);
      });
    });

    starsPicker.addEventListener('mouseleave', () => {
      highlightStars(currentRating);
      updateRatingLabel(currentRating, false);
    });

    // 4. Live Poster Image Preview
    posterInput.addEventListener('input', () => {
      const url = posterInput.value.trim();
      updatePosterPreview(url);
    });

    // 5. Form Submit / Cancel
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });

    btnCancelEdit.addEventListener('click', () => {
      resetForm();
      switchTab('tab-library');
    });

    // 6. Backup & Utility Actions
    btnExport.addEventListener('click', exportLibrary);
    btnImportTrigger.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importLibrary);
    btnReset.addEventListener('click', resetLibrary);

    // 7. Toast Undo Action
    toastAction.addEventListener('click', () => {
      if (deletedItemTemp) {
        library.push(deletedItemTemp);
        Storage.set(library, () => {
          renderLibrary();
          updateStats();
          showToast(`Restored "${deletedItemTemp.title}"`);
          deletedItemTemp = null;
        });
      }
    });
  }

  // --- Navigation ---
  function switchTab(tabId) {
    // Deactivate all buttons and panels
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));

    // Activate selected button and panel
    const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const selectedPanel = document.getElementById(tabId);

    if (selectedBtn && selectedPanel) {
      selectedBtn.classList.add('active');
      selectedPanel.classList.add('active');
    }

    // Custom focuses when switching
    if (tabId === 'tab-add') {
      // If we are NOT in edit mode, make sure form is fresh
      if (!editIdInput.value) {
        titleInput.focus();
      }
    } else if (tabId === 'tab-library') {
      searchInput.focus();
    }
  }

  // --- Interactive Ratings Helper ---
  const ratingTexts = {
    0: 'Choose rating',
    1: 'Poor 🍿',
    2: 'Okay ⭐⭐',
    3: 'Good choice 👍',
    4: 'Great! 🔥',
    5: 'Masterpiece! 🏆'
  };

  function setRating(rating) {
    currentRating = rating;
    highlightStars(rating);
    updateRatingLabel(rating, false);
  }

  function highlightStars(rating) {
    const starButtons = starsPicker.querySelectorAll('.star-btn');
    starButtons.forEach(star => {
      const val = parseInt(star.getAttribute('data-value'), 10);
      if (val <= rating) {
        star.classList.add('selected');
      } else {
        star.classList.remove('selected');
      }
    });
  }

  function updateRatingLabel(rating, isHovering) {
    ratingLabel.textContent = ratingTexts[rating] || 'Choose rating';
    if (isHovering) {
      ratingLabel.style.color = 'var(--text-primary)';
    } else {
      ratingLabel.style.color = rating > 0 ? 'var(--neon-gold)' : 'var(--text-secondary)';
    }
  }

  // --- Poster Preview Helper ---
  function updatePosterPreview(url) {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Poster Preview';
      img.onerror = () => {
        showPosterPlaceholder('Failed to load image');
      };
      img.onload = () => {
        posterPreview.innerHTML = '';
        posterPreview.appendChild(img);
        posterPreview.style.borderStyle = 'solid';
        posterPreview.style.borderColor = 'var(--neon-purple)';
      };
    } else {
      showPosterPlaceholder('Live Preview Area');
    }
  }

  function showPosterPlaceholder(text) {
    posterPreview.innerHTML = `<span class="preview-placeholder">${text}</span>`;
    posterPreview.style.borderStyle = 'dashed';
    posterPreview.style.borderColor = 'var(--border-glass)';
  }

  // --- Form Logic ---
  function resetForm() {
    addForm.reset();
    editIdInput.value = '';
    setRating(0);
    showPosterPlaceholder('Live Preview Area');
    
    // Clear validation error UI
    titleInput.classList.remove('invalid');
    titleError.classList.remove('visible');

    // Restore button texts
    btnSubmit.textContent = 'Save to Library';
    btnCancelEdit.classList.add('hidden');
  }

  function handleFormSubmit() {
    const title = titleInput.value.trim();
    const type = document.querySelector('input[name="item-type"]:checked').value;
    const genreStr = genreInput.value.trim();
    const notes = notesInput.value.trim();
    const posterUrl = posterInput.value.trim();
    const editId = editIdInput.value;

    // Title validation
    if (!title) {
      titleInput.classList.add('invalid');
      titleError.classList.add('visible');
      titleInput.focus();
      return;
    } else {
      titleInput.classList.remove('invalid');
      titleError.classList.remove('visible');
    }

    // Process genres into array of unique words
    const genres = genreStr
      ? genreStr.split(',').map(g => g.trim()).filter(g => g.length > 0)
      : [];

    if (editId) {
      // Editing existing item
      const itemIndex = library.findIndex(item => item.id === editId);
      if (itemIndex > -1) {
        const originalItem = library[itemIndex];
        library[itemIndex] = {
          ...originalItem,
          title,
          type,
          genres,
          rating: currentRating,
          notes,
          posterUrl
        };
        showToast(`Updated "${title}"`);
      }
    } else {
      // Adding new item
      const newItem = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        title,
        type,
        genres,
        rating: currentRating,
        notes,
        posterUrl,
        dateAdded: Date.now()
      };
      library.push(newItem);
      showToast(`Saved "${title}"`);
    }

    Storage.set(library, () => {
      renderLibrary();
      updateStats();
      resetForm();
      switchTab('tab-library');
    });
  }

  // --- Library Rendering ---
  function renderLibrary() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    const activeFilter = document.querySelector('.chip.active').getAttribute('data-filter');
    const activeSort = sortSelect.value;

    // Filter library
    let filteredList = library.filter(item => {
      // Filter by type
      if (activeFilter !== 'all' && item.type !== activeFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const titleMatch = item.title.toLowerCase().includes(searchQuery);
        const notesMatch = item.notes && item.notes.toLowerCase().includes(searchQuery);
        const genresMatch = item.genres && item.genres.some(g => g.toLowerCase().includes(searchQuery));
        return titleMatch || notesMatch || genresMatch;
      }

      return true;
    });

    // Sort library
    filteredList.sort((a, b) => {
      if (activeSort === 'newest') {
        return b.dateAdded - a.dateAdded;
      } else if (activeSort === 'rating-desc') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.dateAdded - a.dateAdded; // fallback
      } else if (activeSort === 'rating-asc') {
        if (b.rating !== a.rating) return a.rating - b.rating;
        return b.dateAdded - a.dateAdded; // fallback
      } else if (activeSort === 'alpha-asc') {
        return a.title.localeCompare(b.title);
      } else if (activeSort === 'alpha-desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });

    // Render list
    libraryList.innerHTML = '';
    
    if (filteredList.length === 0) {
      emptyState.classList.remove('hidden');
      libraryList.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      libraryList.classList.remove('hidden');

      filteredList.forEach(item => {
        const card = createCardElement(item);
        libraryList.appendChild(card);
      });
    }

    // Update global badge
    libraryCountBadge.textContent = `🍿 ${library.length} Saved`;
  }

  function createCardElement(item) {
    const card = document.createElement('div');
    card.className = `item-card type-${item.type}`;
    card.setAttribute('data-id', item.id);

    // 1. Poster side
    const posterDiv = document.createElement('div');
    posterDiv.className = 'card-poster';

    if (item.posterUrl) {
      const img = document.createElement('img');
      img.src = item.posterUrl;
      img.alt = `${item.title} Poster`;
      img.onerror = () => {
        // Fallback to placeholder if link breaks in rendering
        posterDiv.innerHTML = createPosterPlaceholderHTML(item);
      };
      posterDiv.appendChild(img);
    } else {
      posterDiv.innerHTML = createPosterPlaceholderHTML(item);
    }
    card.appendChild(posterDiv);

    // Helper to generate initials & icon for placeholder poster
    function createPosterPlaceholderHTML(element) {
      const emoji = element.type === 'movie' ? '🍿' : '📺';
      const initials = element.title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return `
        <div class="card-poster-placeholder">
          <span style="font-size: 14px; margin-bottom: 2px;">${emoji}</span>
          <span>${initials}</span>
        </div>
      `;
    }

    // 2. Card Details side
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'card-details';

    // Top Section (Title, Tags, Edit/Delete Action)
    const topDiv = document.createElement('div');
    topDiv.className = 'card-top';

    const titleArea = document.createElement('div');
    titleArea.className = 'card-title-area';

    const titleH3 = document.createElement('h3');
    titleH3.className = 'card-title';
    titleH3.textContent = item.title;
    titleH3.title = item.title;
    titleArea.appendChild(titleH3);

    // Tags list
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'card-meta-tags';

    const typeTag = document.createElement('span');
    typeTag.className = 'badge-tag type';
    typeTag.textContent = item.type === 'movie' ? 'Movie' : 'Show';
    tagsDiv.appendChild(typeTag);

    // Genres Tags
    if (item.genres && item.genres.length > 0) {
      item.genres.slice(0, 2).forEach(g => {
        const genreTag = document.createElement('span');
        genreTag.className = 'badge-tag genre';
        genreTag.textContent = g;
        tagsDiv.appendChild(genreTag);
      });
    }
    titleArea.appendChild(tagsDiv);
    topDiv.appendChild(titleArea);

    // Actions icons (Edit, Delete)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'action-btn edit';
    btnEdit.setAttribute('aria-label', 'Edit entry');
    btnEdit.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
      </svg>
    `;
    btnEdit.addEventListener('click', () => handleEditItem(item.id));
    actionsDiv.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.className = 'action-btn delete';
    btnDelete.setAttribute('aria-label', 'Delete entry');
    btnDelete.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    btnDelete.addEventListener('click', () => handleDeleteItem(item.id));
    actionsDiv.appendChild(btnDelete);

    topDiv.appendChild(actionsDiv);
    detailsDiv.appendChild(topDiv);

    // Bottom Section (Notes, Rating Stars)
    const bottomDiv = document.createElement('div');
    bottomDiv.className = 'card-bottom';

    const notesSpan = document.createElement('span');
    notesSpan.className = 'card-notes';
    notesSpan.textContent = item.notes ? `"${item.notes}"` : 'No notes added';
    bottomDiv.appendChild(notesSpan);

    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'card-rating-display';
    
    if (item.rating > 0) {
      ratingDiv.textContent = '★'.repeat(item.rating);
    } else {
      ratingDiv.className = 'card-rating-display card-rating-empty';
      ratingDiv.textContent = 'Unrated';
    }
    bottomDiv.appendChild(ratingDiv);

    detailsDiv.appendChild(bottomDiv);
    card.appendChild(detailsDiv);

    return card;
  }

  // --- Edit Handler ---
  function handleEditItem(id) {
    const item = library.find(item => item.id === id);
    if (!item) return;

    // Fill form
    editIdInput.value = item.id;
    titleInput.value = item.title;
    
    // Set type radio
    const radioToSelect = document.querySelector(`input[name="item-type"][value="${item.type}"]`);
    if (radioToSelect) radioToSelect.checked = true;

    // Genres & Notes
    genreInput.value = item.genres ? item.genres.join(', ') : '';
    notesInput.value = item.notes || '';
    
    // Rating
    setRating(item.rating);

    // Poster
    posterInput.value = item.posterUrl || '';
    updatePosterPreview(item.posterUrl || '');

    // UI text changes for editing
    btnSubmit.textContent = 'Update Favorite';
    btnCancelEdit.classList.remove('hidden');

    switchTab('tab-add');
  }

  // --- Delete Handler ---
  function handleDeleteItem(id) {
    const itemIndex = library.findIndex(item => item.id === id);
    if (itemIndex === -1) return;

    deletedItemTemp = library[itemIndex];
    library.splice(itemIndex, 1);

    Storage.set(library, () => {
      renderLibrary();
      updateStats();
      showToast(`Deleted "${deletedItemTemp.title}"`, true);
    });
  }

  // --- Statistics Logic ---
  function updateStats() {
    const totalCount = library.length;
    const moviesCount = library.filter(item => item.type === 'movie').length;
    const showsCount = library.filter(item => item.type === 'show').length;

    // Average rating
    const ratedItems = library.filter(item => item.rating > 0);
    const avgRating = ratedItems.length > 0
      ? (ratedItems.reduce((acc, curr) => acc + curr.rating, 0) / ratedItems.length).toFixed(1)
      : '0.0';

    // Render overview stats
    statTotal.textContent = totalCount;
    statMovies.textContent = moviesCount;
    statShows.textContent = showsCount;
    statAvgRating.textContent = avgRating;

    // Calculate top genres
    const genreCounts = {};
    library.forEach(item => {
      if (item.genres) {
        item.genres.forEach(g => {
          // Normalize genre key
          const normalized = g.trim();
          if (normalized) {
            genreCounts[normalized] = (genreCounts[normalized] || 0) + 1;
          }
        });
      }
    });

    // Sort genres by count desc
    const sortedGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);

    topGenresList.innerHTML = '';
    if (sortedGenres.length === 0) {
      topGenresList.innerHTML = '<span class="no-genres-placeholder">No genres recorded yet</span>';
    } else {
      sortedGenres.slice(0, 4).forEach(genre => {
        const count = genreCounts[genre];
        const badge = document.createElement('span');
        badge.className = 'genre-stat-badge';
        badge.innerHTML = `${escapeHTML(genre)} <span>(${count})</span>`;
        topGenresList.appendChild(badge);
      });
    }
  }

  // Helper to escape HTML tags
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // --- Backup & Restore & Utilities ---
  function exportLibrary() {
    if (library.length === 0) {
      showToast('Library is empty. Add items first!');
      return;
    }

    const dataStr = JSON.stringify(library, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cinekeep_backup_${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Library exported successfully');
  }

  function importLibrary(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        
        // Validation: Must be array
        if (!Array.isArray(importedData)) {
          throw new Error('Backup format is invalid (must be a JSON array).');
        }

        // Validate structure of items (minimal check)
        const isValid = importedData.every(item => item && typeof item === 'object' && item.title);
        if (!isValid) {
          throw new Error('Backup format is invalid (missing titles).');
        }

        // Merge logic: Merge with existing items based on ID or title
        let mergedCount = 0;
        importedData.forEach(importedItem => {
          // Check if item already exists by ID or case-insensitive title match
          const exists = library.some(existing => 
            existing.id === importedItem.id || 
            existing.title.toLowerCase() === importedItem.title.toLowerCase()
          );

          if (!exists) {
            // Generate valid timestamps and IDs if missing
            if (!importedItem.id) {
              importedItem.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            }
            if (!importedItem.dateAdded) {
              importedItem.dateAdded = Date.now();
            }
            library.push(importedItem);
            mergedCount++;
          }
        });

        if (mergedCount === 0) {
          showToast('No new items to import.');
        } else {
          Storage.set(library, () => {
            renderLibrary();
            updateStats();
            showToast(`Imported ${mergedCount} new items!`);
          });
        }
      } catch (err) {
        showToast('Error importing file: ' + err.message);
      } finally {
        importFileInput.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
  }

  function resetLibrary() {
    if (library.length === 0) {
      showToast('Library is already empty.');
      return;
    }

    // Double confirmation via confirm box
    const confirmMessage = 'Are you sure you want to permanently delete all saved items? This cannot be undone.';
    if (window.confirm(confirmMessage)) {
      library = [];
      Storage.set(library, () => {
        renderLibrary();
        updateStats();
        resetForm();
        showToast('Library wiped.');
      });
    }
  }

  // --- Toast Notification Helper ---
  function showToast(message, showUndo = false) {
    // Clear existing timer
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastMessage.textContent = message;
    
    if (showUndo) {
      toastAction.classList.remove('hidden');
    } else {
      toastAction.classList.add('hidden');
    }

    toast.classList.remove('hidden');

    // Auto-fadeout after 4 seconds (unless it requires critical user interaction, but undo fades too)
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
      if (showUndo) {
        deletedItemTemp = null; // Clear deleted ref after toast vanishes
      }
    }, 4500);
  }
});
