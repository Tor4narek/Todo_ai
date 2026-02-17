(() => {
  const STORAGE_KEY = 'todo-list-data-v1';

  const elements = {
    form: document.getElementById('todo-form'),
    input: document.getElementById('todo-input'),
    error: document.getElementById('form-error'),
    list: document.getElementById('todo-list'),
    filters: document.querySelector('.todo-footer__filters'),
    itemsLeft: document.getElementById('items-left'),
    clearCompletedBtn: document.getElementById('clear-completed')
  };

  const TodoStore = (() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    const write = (tasks) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    };

    return { read, write };
  })();

  const state = {
    tasks: TodoStore.read(),
    filter: 'all'
  };

  const createId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const getFilteredTasks = () => {
    if (state.filter === 'active') {
      return state.tasks.filter((task) => !task.completed);
    }
    if (state.filter === 'completed') {
      return state.tasks.filter((task) => task.completed);
    }
    return state.tasks;
  };

  const render = () => {
    const filtered = getFilteredTasks();

    elements.list.innerHTML = filtered
      .map(
        (task) => `
          <li class="todo-item ${task.completed ? 'is-completed' : ''}" data-id="${task.id}">
            <input
              class="todo-item__check"
              type="checkbox"
              aria-label="Отметить задачу выполненной"
              ${task.completed ? 'checked' : ''}
            />
            <span class="todo-item__text" title="Двойной клик для редактирования">${escapeHtml(task.text)}</span>
            <div class="todo-item__actions">
              <button class="icon-btn" data-action="edit" type="button">Изм.</button>
              <button class="icon-btn icon-btn--danger" data-action="delete" type="button">Удалить</button>
            </div>
          </li>
        `
      )
      .join('');

    const activeCount = state.tasks.filter((task) => !task.completed).length;
    elements.itemsLeft.textContent = `${activeCount} ${pluralizeTasks(activeCount)} осталось`;

    [...elements.filters.querySelectorAll('.filter-btn')].forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === state.filter);
    });
  };

  const pluralizeTasks = (count) => {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return 'задача';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'задачи';
    return 'задач';
  };

  const commit = () => {
    TodoStore.write(state.tasks);
    render();
  };

  const addTask = (text) => {
    const task = {
      id: createId(),
      text,
      completed: false,
      createdAt: Date.now()
    };

    state.tasks = [task, ...state.tasks];
    commit();
  };

  const removeTask = (taskId) => {
    state.tasks = state.tasks.filter((task) => task.id !== taskId);
    commit();
  };

  const updateTask = (taskId, payload) => {
    state.tasks = state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...payload
          }
        : task
    );
    commit();
  };

  const showError = (message) => {
    elements.error.textContent = message;
  };

  const clearError = () => {
    elements.error.textContent = '';
  };

  const startEditing = (taskItem) => {
    const textEl = taskItem.querySelector('.todo-item__text');
    if (!textEl) return;

    const currentValue = textEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-item__text-input';
    input.value = currentValue;
    input.maxLength = 120;

    textEl.replaceWith(input);
    input.focus();
    input.select();

    const finishEdit = (save) => {
      const nextValue = input.value.trim();
      if (save && nextValue) {
        updateTask(taskItem.dataset.id, { text: nextValue });
      } else {
        render();
      }
    };

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') finishEdit(true);
      if (event.key === 'Escape') finishEdit(false);
    });

    input.addEventListener('blur', () => finishEdit(true));
  };

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = elements.input.value.trim();

    if (!value) {
      showError('Введите текст задачи.');
      return;
    }

    clearError();
    addTask(value);
    elements.input.value = '';
    elements.input.focus();
  });

  elements.input.addEventListener('input', () => {
    if (elements.error.textContent) {
      clearError();
    }
  });

  elements.list.addEventListener('click', (event) => {
    const item = event.target.closest('.todo-item');
    if (!item) return;

    const target = event.target;
    const taskId = item.dataset.id;

    if (target.classList.contains('todo-item__check')) {
      updateTask(taskId, { completed: target.checked });
      return;
    }

    const actionButton = target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.action;

    if (action === 'delete') {
      item.classList.add('is-removing');
      setTimeout(() => removeTask(taskId), 200);
      return;
    }

    if (action === 'edit') {
      startEditing(item);
    }
  });

  elements.list.addEventListener('dblclick', (event) => {
    const textNode = event.target.closest('.todo-item__text');
    if (!textNode) return;

    const item = textNode.closest('.todo-item');
    if (!item) return;

    startEditing(item);
  });

  elements.filters.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;

    state.filter = button.dataset.filter;
    render();
  });

  elements.clearCompletedBtn.addEventListener('click', () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    commit();
  });

  render();
})();
