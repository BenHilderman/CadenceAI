.PHONY: test test-server test-web install lint

test: test-server test-web ## Run all tests

test-server: ## Run server tests (activate venv first: source server/.venv/bin/activate)
	cd server && python -m pytest -v

test-web: ## Run frontend tests
	cd web && npx vitest run

install: ## Install all dependencies
	cd server && pip install -r requirements.txt
	cd web && npm install

lint: ## Run linters
	cd server && python -m py_compile main.py
	cd web && npx eslint .
