# Remove when @universal-deploy/node sets NODE_ENV before importing the user entry.
NODE_ENV=production exec vike preview "$@"
