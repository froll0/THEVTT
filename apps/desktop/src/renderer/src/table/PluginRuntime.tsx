import { useEffect, useRef } from 'react';
import { PluginRunner, running, usePlugins } from '../lib/plugins';
import { useApp } from '../store/app';
import { useTable } from '../store/table';

/** The user's enabled extensions run while they sit at the table. */
export function PluginRuntime() {
  const me = useApp((s) => s.user?.id ?? '');
  const plugins = usePlugins((s) => s.plugins);
  const load = usePlugins((s) => s.load);
  const state = useTable((s) => s.state);
  const lastLog = useRef<string | null>(null);

  useEffect(() => {
    if (me) void load(me);
  }, [me, load]);

  // start what is switched on, stop what isn't (or changed)
  useEffect(() => {
    const on = plugins.filter((p) => p.enabled);
    for (const [id, r] of running) {
      const p = on.find((x) => x.id === id);
      if (!p || p.code !== r.plugin.code) {
        r.stop();
        running.delete(id);
      }
    }
    for (const p of on) {
      if (running.has(p.id)) continue;
      try {
        const r = new PluginRunner(p, {
          dispatch: (a) => useTable.getState().dispatch(a),
          toast: (t) => useApp.getState().toast(t),
        });
        running.set(p.id, r);
        const st = useTable.getState().state;
        if (st) r.state(st);
      } catch (e) {
        usePlugins.setState((s) => ({ errors: { ...s.errors, [p.id]: String((e as Error).message) } }));
      }
    }
  }, [plugins]);

  useEffect(
    () => () => {
      for (const r of running.values()) r.stop();
      running.clear();
    },
    [],
  );

  // the table as this user sees it, and what is new in the chat
  useEffect(() => {
    if (!state || !running.size) {
      lastLog.current = state?.log.at(-1)?.id ?? null;
      return;
    }
    const from = lastLog.current ? state.log.findIndex((e) => e.id === lastLog.current) : state.log.length - 1;
    const fresh = from >= 0 ? state.log.slice(from + 1) : [];
    lastLog.current = state.log.at(-1)?.id ?? null;
    for (const r of running.values()) {
      r.state(state);
      r.log(fresh);
    }
  }, [state]);

  return null;
}
