import re

file_path = "dashboard.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace all forms of fetch(...) .then(...json())
new_content = re.sub(
    r"fetch\((.*?)\)\s*\.then\(\s*\w+\s*=>\s*\w+\.json\(\)\s*\)",
    r"window.apiFetch(\1)",
    content,
    flags=re.DOTALL
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("done")
