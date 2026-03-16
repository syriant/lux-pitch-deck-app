# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
React frontend for the Luxury Escapes AI pitch deck automation tool.
API lives at ../lux-pitch-deck-api.

## Stack
- React, TypeScript, Tailwind CSS
- Zod for form/API response validation
- See docs/architecture.md for component structure
- See docs/tasks.md for current task checklist
- See docs/implementation-plan.md for full technical detail

## Conventions
- Functional components and hooks only
- API calls via a centralised service layer — no inline fetch in components
- Form state with React Hook Form
- Named exports only — no default exports except page-level components

## Commands
- Start dev: `npm run dev`
- Typecheck: `tsc --noEmit`
- Run tests: `npm test`

## Session Notes
When compacting, always preserve:
- Files modified this session
- Any failing tests and error messages
- Architectural decisions made this session
