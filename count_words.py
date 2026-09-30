import sys

def count_words(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    words = text.split()
    return len(words)

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "article/README.md"
    total = count_words(path)
    print(f"Total word count for {path}: {total}")
