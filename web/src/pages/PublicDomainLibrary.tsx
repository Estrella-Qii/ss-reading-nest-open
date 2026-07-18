import { useState } from "react";
import type { PublicDomainBook } from "../features/public-domain/provider.js";

export function PublicDomainLibrary(props: {
  onBack: () => void;
  onSearch: (query: string) => Promise<PublicDomainBook[]>;
  onImport: (book: PublicDomainBook) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<PublicDomainBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importingId, setImportingId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  async function search() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      setBooks(await props.onSearch(query.trim()));
    } catch {
      setBooks([]);
      setError("公版书库暂时没有响应，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="library-shell">
      <button className="back-link" onClick={props.onBack}>‹ 返回书架</button>
      <header className="library-heading">
        <span>PUBLIC DOMAIN</span>
        <h1>英文公版文学</h1>
        <p>只显示明确标记为美国公共领域、无译者的英文原文。版权状态不明的作品不会导入。</p>
      </header>
      <form className="library-search" onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <input aria-label="搜索英文公版作品" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or author" />
        <button type="submit" disabled={!query.trim() || loading}>{loading ? "搜索中…" : "搜索"}</button>
      </form>
      {error ? (
        <div className="library-message" role="alert">
          <p>{error}</p>
          <button type="button" disabled={loading} onClick={() => void search()}>重试</button>
        </div>
      ) : null}
      {!loading && !error && books.length === 0 ? (
        <p className="library-message">
          {hasSearched ? "没有找到符合条件的英文公版原文，换一个书名或作者试试。" : "从 Austen、Dickens 或 Brontë 开始。"}
        </p>
      ) : null}
      <section className="library-results" aria-label="公版作品搜索结果">
        {books.map((book) => (
          <article className="library-book" key={book.providerId}>
            {book.coverUrl ? <img src={book.coverUrl} alt={`《${book.title}》封面`} /> : <div className="library-cover-fallback">BOOK</div>}
            <div>
              <h2>{book.title}</h2>
              <p className="library-author">{book.author} · {book.language}</p>
              <p>{book.description || "Project Gutenberg public-domain text."}</p>
              <button type="button" disabled={Boolean(importingId)} onClick={async () => {
                setImportingId(book.providerId);
                setError("");
                try {
                  await props.onImport(book);
                } catch {
                  setError("正文导入失败，可能是书源暂时不可用；请稍后重试。");
                } finally {
                  setImportingId("");
                }
              }}>{importingId === book.providerId ? "导入中…" : "导入私人书架"}</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
