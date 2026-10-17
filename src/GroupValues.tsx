import { useMemo, useState } from "react";
import { type Source, type Config, type GroupConfig } from "./domain";
import { groups, prepare } from "./engine";
export function GroupValues({
  source,
  config,
  group: g,
  index,
  change,
}: {
  source: Source;
  config: Config;
  group: GroupConfig;
  index: number;
  change: (v: Partial<GroupConfig>) => void;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const choices = useMemo(() => {
    if (!g.mode || g.mode === "all") return [];
    try {
      const ds = prepare(source, {
        ...config,
        reports: ["Report Data"],
        period: "all",
        groups: [],
      });
      return groups(ds.records, {
        ...g,
        mode: "all",
        values: [],
        sort: "label",
        descending: false,
        dateOrder: config.dateOrder,
        date1904: source.date1904,
      }).map((x) => x.label);
    } catch {
      return [];
    }
  }, [source, g.mode, g.column, g.level, config.numberStyle, config.dateOrder]);
  const found = choices.filter((x) =>
      x.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    ),
    pages = Math.max(1, Math.ceil(found.length / 50)),
    current = Math.min(page, pages - 1);
  return (
    <>
      <label>
        Include values
        <select
          value={g.mode || "all"}
          onChange={(e) => {
            change({ mode: e.target.value as GroupConfig["mode"], values: [] });
            setPage(0);
          }}
        >
          <option value="all">All values</option>
          <option value="one">One value</option>
          <option value="selected">Selected values</option>
        </select>
      </label>
      {g.mode && g.mode !== "all" && (
        <>
          <label>
            Search values
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <div className="actions">
            <button
              className="secondary"
              onClick={() =>
                change({
                  values: g.mode === "one" ? choices.slice(0, 1) : choices,
                })
              }
            >
              Select all values
            </button>
            <button
              className="secondary"
              onClick={() => change({ values: [] })}
            >
              Clear selection
            </button>
          </div>
          <p role="status">
            {found.length} matching values · {g.values.length} selected · page{" "}
            {current + 1} of {pages}
          </p>
          <div>
            {found.slice(current * 50, current * 50 + 50).map((value) => (
              <label className="check-row" key={value}>
                <input
                  type={g.mode === "one" ? "radio" : "checkbox"}
                  name={`group-${index}`}
                  checked={g.values.includes(value)}
                  onChange={(e) =>
                    change({
                      values:
                        g.mode === "one"
                          ? [value]
                          : e.target.checked
                            ? [...g.values, value]
                            : g.values.filter((x) => x !== value),
                    })
                  }
                />
                {value}
              </label>
            ))}
          </div>
          <div className="actions">
            <button
              className="secondary"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous values
            </button>
            <button
              className="secondary"
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Next values
            </button>
          </div>
        </>
      )}
    </>
  );
}
