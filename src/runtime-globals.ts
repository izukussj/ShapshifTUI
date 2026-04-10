import React from 'react';
import * as Ink from 'ink';
import TextInput from 'ink-text-input';
import { Button } from './components.js';

/**
 * The set of names exposed inside the sandbox. The AI-generated component
 * receives these via destructuring on its props *and* sees them as bare
 * identifiers in scope (because we inject them as the vm context globals).
 *
 * Keep this list small and stable — it is the public API of shapeshiftui.
 */
export const runtimeGlobals = {
  React,
  // hooks
  useState: React.useState,
  useEffect: React.useEffect,
  useRef: React.useRef,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useReducer: React.useReducer,
  // ink primitives
  Box: Ink.Box,
  Text: Ink.Text,
  Newline: Ink.Newline,
  Spacer: Ink.Spacer,
  Static: Ink.Static,
  Transform: Ink.Transform,
  useFocus: Ink.useFocus,
  useFocusManager: Ink.useFocusManager,
  useInput: Ink.useInput,
  // input + custom widgets
  TextInput,
  Button,
};

export type RuntimeGlobals = typeof runtimeGlobals;
