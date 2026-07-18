import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicDomainLibrary } from "./PublicDomainLibrary.js";

describe("PublicDomainLibrary", () => {
  it("searches and imports one English public-domain work", async () => {
    const book = {
      providerId: "gutenberg-1342",
      title: "Pride and Prejudice",
      author: "Austen, Jane",
      language: "English",
      description: "A novel of manners.",
      coverUrl: "https://example.test/cover.jpg"
    };
    const onSearch = vi.fn().mockResolvedValue([book]);
    const onImport = vi.fn().mockResolvedValue(undefined);
    render(<PublicDomainLibrary onBack={vi.fn()} onSearch={onSearch} onImport={onImport} />);
    fireEvent.change(screen.getByLabelText("搜索英文公版作品"), { target: { value: "Austen" } });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByText("Pride and Prejudice")).toBeInTheDocument();
    expect(screen.getByText("Austen, Jane · English")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "导入私人书架" }));
    await waitFor(() => expect(onImport).toHaveBeenCalledWith(book));
  });

  it("shows retry and a distinct empty result state", async () => {
    const onSearch = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce([]);
    render(<PublicDomainLibrary onBack={vi.fn()} onSearch={onSearch} onImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("搜索英文公版作品"), { target: { value: "Unknown" } });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("暂时没有响应");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText(/没有找到符合条件/)).toBeInTheDocument();
    expect(onSearch).toHaveBeenCalledTimes(2);
  });
});
