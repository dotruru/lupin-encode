"""
Simple test of tls-requests for GitHub scraping
"""
import tls_requests

# Test direct get method
url = "https://api.github.com/repos/elder-plinius/CL4R1T4S/contents/"
response = tls_requests.get(url, timeout=10)

print(f"Status: {response.status_code}")
print(f"Headers: {response.headers.get('x-ratelimit-remaining')}")

if response.status_code == 200:
    data = response.json()
    print(f"Found {len(data)} items")
    for item in data[:5]:
        print(f"  - {item['name']} ({item['type']})")
