# GitHub Scraper using TLS Requests

A Python-based GitHub repository scraper that uses the `tls-requests` module for secure HTTP requests with browser-like TLS fingerprinting.

## Features

- **TLS Requests**: Uses the `tls-requests` library for secure, browser-like HTTP requests
- **Regex Filtering**: Filters out repository names containing asterisks (*) using regex patterns
- **Multi-page Scraping**: Scrapes multiple pages of search results (configurable)
- **JSON Export**: Saves scraped results to a JSON file
- **Rate Limiting**: Includes delays between requests to be respectful of GitHub's servers
- **Error Handling**: Robust error handling for network issues and rate limits

## Installation

1. Install Python 3.9 or higher

2. Install the tls-requests library:
```bash
pip install wrapper-tls-requests
```

Or install directly from GitHub:
```bash
pip install git+https://github.com/thewebscraping/tls-requests.git
```

## Usage

### Basic Usage

Run the scraper with default settings (searches for "flutter", scrapes 8 pages):

```bash
python3 github_scraper.py
```

### Customizing the Search

Edit the `main()` function in `github_scraper.py` to customize:

```python
# Change search query and number of pages
scraper = GitHubScraper(query="your-search-term", pages=5)
```

### Programmatic Usage

```python
from github_scraper import GitHubScraper

# Initialize scraper
scraper = GitHubScraper(query="python", pages=3)

# Scrape repositories
results = scraper.scrape()

# Print summary
scraper.print_summary(limit=10)

# Save results
scraper.save_results("my_results.json")
```

## How It Works

1. **TLS Requests**: Uses the `tls-requests` library which provides browser-like TLS fingerprinting
2. **HTML Parsing**: Extracts repository information from GitHub's search results HTML using regex
3. **Filtering**: Applies regex pattern `r'\*'` to filter out repository names containing asterisks
4. **Pagination**: Iterates through multiple pages of search results
5. **Export**: Saves all results to a JSON file

## Output Format

Results are saved in JSON format:

```json
[
  {
    "name": "flutter",
    "full_name": "flutter/flutter",
    "html_url": "https://github.com/flutter/flutter"
  },
  ...
]
```

## Features Explained

### Star Filtering with Regex

The scraper uses Python's `re` module to filter out results:

```python
star_pattern = re.compile(r'\*')
if not star_pattern.search(name):
    # Include this result
```

This removes any repository names or paths containing the asterisk character.

### TLS Requests Module

The `tls-requests` library provides:
- Browser-like TLS client fingerprinting
- Anti-bot page bypass capabilities
- High performance HTTP requests
- Automatic TLS library version management

## Configuration

Key parameters you can adjust in the `GitHubScraper` class:

- `query`: Search term (default: "flutter")
- `pages`: Number of pages to scrape (default: 8)
- `timeout`: Request timeout in seconds (default: 30)
- Delay between requests: Currently set to 2 seconds

## Example Output

```
Starting scraper for query: 'flutter'
Scraping 8 pages...

Fetching page 1/8...
  Found 13 repositories on page 1
  After filtering stars: 13 items

...

============================================================
Total results collected: 104
============================================================

RESULTS SUMMARY (showing first 15 items)
============================================================

1. Repository: flutter/flutter
   Name: flutter
   URL: https://github.com/flutter/flutter

...
```

## Error Handling

The scraper handles:
- Network errors and timeouts
- Rate limiting (HTTP 429)
- Invalid HTML responses
- Connection failures

## Notes

- Respects GitHub's servers with delays between requests
- Does not require authentication for public searches
- Results are limited to what's available in GitHub's web search
- TLS library is automatically downloaded and managed by `tls-requests`

## License

This project is provided as-is for educational purposes.

## Dependencies

- Python 3.9+
- `tls-requests` (wrapper-tls-requests on PyPI)
- Standard library: `re`, `json`, `time`, `typing`
