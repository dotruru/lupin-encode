#!/usr/bin/env python3
"""
GitHub Scraper using tls_requests
Searches GitHub for repositories and filters out results with stars in names using regex.
"""

import json
import re
import time
from typing import Any, Dict, List

import tls_requests


class GitHubScraper:
    """Scraper for GitHub search results using tls_requests."""

    BASE_URL = "https://github.com/search"

    def __init__(
        self,
        query: str = """(path:_.xml OR path:_.json OR path:_.properties OR path:_.sql OR path:_.txt OR path:_.log OR path:_.tmp OR path:_.backup OR path:_.bak OR path:_.enc OR path:_.yml OR path:_.yaml OR path:_.toml OR path:_.ini OR path:_.config OR path:_.conf OR path:_.cfg OR path:_.env OR path:_.envrc OR path:_.prod OR path:_.secret OR path:_.private OR path:\\*.key) AND (access_key OR secret_key OR access_token OR api_key OR apikey OR api_secret OR apiSecret OR app_secret OR application_key OR app_key OR appkey OR auth_token OR authsecret) AND ("sk-" AND (openai OR gpt))""",
        pages: int = 8,
    ):
        """
        Initialize the scraper.

        Args:
            query: Search query string
            pages: Number of pages to scrape
        """
        self.query = query
        self.pages = pages
        self.results: List[Dict[str, Any]] = []

    def scrape(self) -> List[Dict[str, Any]]:
        """
        Scrape GitHub for the specified query across multiple pages.

        Returns:
            List of filtered results (without stars in name)
        """
        print(f"Starting scraper for query: '{self.query}'")
        print(f"Scraping {self.pages} pages...")

        for page in range(1, self.pages + 1):
            print(f"\nFetching page {page}/{self.pages}...")

            url = f"{self.BASE_URL}?q={self.query}&type=repositories&p={page}"

            try:
                response = tls_requests.get(
                    url,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "text/html",
                    },
                    timeout=30,
                )

                if response.status_code == 200:
                    html = response.text

                    # Extract repository information from HTML
                    items = self._parse_html(html)
                    print(f"  Found {len(items)} repositories on page {page}")

                    # Filter out items with stars in their name using regex
                    filtered_items = self._filter_stars(items)
                    print(f"  After filtering stars: {len(filtered_items)} items")

                    self.results.extend(filtered_items)

                    # Check if we've reached the end
                    if len(items) == 0:
                        print(f"\nReached end of results at page {page}")
                        break

                    # Add small delay to be respectful
                    if page < self.pages:
                        time.sleep(2)

                elif response.status_code == 429:
                    print(f"  Error: Rate limit exceeded")
                    break
                else:
                    print(f"  Error: Status code {response.status_code}")

            except Exception as e:
                print(f"  Exception occurred: {str(e)}")
                continue

        print(f"\n{'='*60}")
        print(f"Total results collected: {len(self.results)}")
        print(f"{'='*60}")

        return self.results

    def _parse_html(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse HTML to extract repository information using multiple patterns.

        Args:
            html: HTML content from GitHub search

        Returns:
            List of repository items
        """
        items = []
        seen = set()

        # Multiple patterns to catch different HTML structures
        patterns = [
            # Pattern 1: Standard repo links
            r'<a\s+[^>]*href="/([\w\-\.]+/[\w\-\.]+)"[^>]*>\s*<span[^>]*>([^<]+)</span>',
            # Pattern 2: Alternative format
            r'href="/([\w\-\.]+/[\w\-\.]+)"[^>]*data-view-component="true"[^>]*>([^<]+)<',
            # Pattern 3: Simple repo link
            r'<a[^>]+href="/([\w\-\.]+/[\w\-\.]+)"',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, html)
            for match in matches:
                repo_path = match.group(1)

                # Skip certain paths
                if any(
                    skip in repo_path.lower()
                    for skip in [
                        "search",
                        "topics",
                        "collections",
                        "trending",
                        "features",
                        "sponsors",
                        "orgs",
                    ]
                ):
                    continue

                # Validate it's a repo path (owner/repo format)
                parts = repo_path.split("/")
                if len(parts) != 2 or not parts[0] or not parts[1]:
                    continue

                if repo_path not in seen:
                    seen.add(repo_path)
                    items.append(
                        {
                            "name": parts[1],
                            "full_name": repo_path,
                            "html_url": f"https://github.com/{repo_path}",
                        }
                    )

        return items

    def _filter_stars(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter out items that contain stars/asterisks in their name using regex.

        Args:
            items: List of repository items

        Returns:
            Filtered list without items containing stars
        """
        # Regex pattern to match asterisks/stars
        star_pattern = re.compile(r"\*")

        filtered = []
        for item in items:
            name = item.get("name", "")
            full_name = item.get("full_name", "")

            # Check if name or full_name contains stars
            if not star_pattern.search(name) and not star_pattern.search(full_name):
                filtered.append(item)
            else:
                print(f"    Filtered out: {full_name} (contains asterisk)")

        return filtered

    def save_results(self, filename: str = "github_results.json"):
        """
        Save results to a JSON file.

        Args:
            filename: Output filename
        """
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {filename}")

    def print_summary(self, limit: int = 10):
        """
        Print a summary of results.

        Args:
            limit: Number of results to display
        """
        print(f"\n{'='*60}")
        print(f"RESULTS SUMMARY (showing first {min(limit, len(self.results))} items)")
        print(f"{'='*60}\n")

        for i, item in enumerate(self.results[:limit], 1):
            print(f"{i}. Repository: {item.get('full_name')}")
            print(f"   Name: {item.get('name')}")
            print(f"   URL: {item.get('html_url')}")
            print()


def main():
    """Main function to run the scraper."""
    # Initialize scraper with "flutter" query
    scraper = GitHubScraper(query="flutter", pages=8)

    # Scrape the results
    results = scraper.scrape()

    # Print summary
    if results:
        scraper.print_summary(limit=15)

        # Save to file
        scraper.save_results("flutter_github_results.json")
    else:
        print("\nNo results found.")


if __name__ == "__main__":
    main()
