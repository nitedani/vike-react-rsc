// Todo component styles

export const todoStyles = {
  // Main container
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '2rem',
    borderRadius: '16px',
    backgroundColor: 'white',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
    '@media (max-width: 768px)': {
      padding: '1.5rem'
    }
  },

  // Form styles
  form: {
    marginBottom: '2rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    position: 'relative',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '1rem',
    },
  },

  input: {
    flex: 1,
    padding: '1rem 1.25rem',
    borderRadius: '50px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    width: '100%',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
    ':focus': {
      outline: 'none',
      borderColor: '#0070f3',
      boxShadow: '0 0 0 3px rgba(0, 112, 243, 0.2)',
    },
  },

  addButton: {
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    padding: '1rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(0, 118, 255, 0.39)',
    minWidth: '120px',
    '@media (max-width: 768px)': {
      width: '100%',
    },
    ':hover': {
      backgroundColor: '#005cc5',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(0, 118, 255, 0.23)',
    },
    ':disabled': {
      backgroundColor: '#ccc',
      transform: 'none',
      boxShadow: 'none',
      cursor: 'not-allowed',
    },
  },

  loadingButtonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },

  // Task container
  taskContainer: {
    minHeight: '200px', // Ensures consistent height
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1.5rem'
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '3rem 2rem',
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '12px',
    border: '2px dashed #ddd',
    flex: 1, // Fill available space
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },

  emptyStateText: {
    fontSize: '1.1rem',
    fontWeight: '500',
    margin: 0
  },

  // Task list
  taskList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },

  // Status bar
  statusBar: {
    padding: '1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 112, 243, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#666',
    fontSize: '0.9rem',
    border: '1px solid rgba(0, 112, 243, 0.1)'
  },

  // Todo item
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
    gap: '1rem',
    transition: 'all 0.2s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      transform: 'translateY(-2px)',
      borderColor: '#ddd'
    }
  },

  todoCheckbox: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid #ddd',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
    ':hover': {
      borderColor: '#0070f3',
      backgroundColor: 'rgba(0, 112, 243, 0.1)',
    },
  },

  todoCheckboxCompleted: {
    border: 'none',
    backgroundColor: '#0070f3',
    ':hover': {
      backgroundColor: '#005cc5',
    },
  },

  todoTitle: {
    flex: 1,
    fontSize: '1rem',
    color: '#333',
    margin: 0,
    transition: 'all 0.2s ease',
  },

  todoTitleCompleted: {
    textDecoration: 'line-through',
    color: '#999',
  },

  todoDeleteButton: {
    backgroundColor: 'transparent',
    color: '#ff4757',
    border: 'none',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
    ':hover': {
      backgroundColor: 'rgba(255, 71, 87, 0.1)',
    },
  },

  todoDate: {
    fontSize: '0.8rem',
    color: '#999',
    marginLeft: 'auto',
    marginRight: '0.5rem',
  }
};
