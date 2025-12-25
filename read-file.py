import csv
import time

INPUT_FILE = "data.csv"
ROWS_PER_FILE = 1_000_000
TOTAL_ROWS = 6_185_391  # known total, for progress %
OUTPUT_PREFIX = "data_clean_part"

COLUMNS = [
    (0, "video_url"),
    (1, "title"),
    (2, "duration"),
    (3, "thumbnail_url"),
    (4, "embed_code"),
    (5, "tags"),
    (6, "actors"),
    (7, "views"),
    (8, "category"),
    (9, "quality"),
    (10, "uploader"),
    (11, "empty_field"),
    (12, "publish_date"),
    (13, "thumbnail_url_2"),
    (14, "status"),
]

max_col_index = max(idx for idx, _ in COLUMNS)

start_time = time.time()
file_index = 1
row_in_file = 0
processed = 0

def open_new_file(index):
    f = open(f"{OUTPUT_PREFIX}_{index}.csv", "w", newline="", encoding="utf-8")
    w = csv.writer(f, delimiter=";")
    w.writerow([name for _, name in COLUMNS])
    return f, w

with open(INPUT_FILE, "r", encoding="utf-8", errors="ignore") as fin:
    reader = csv.reader(fin, delimiter=";")

    fout, writer = open_new_file(file_index)

    for row in reader:
        processed += 1

        # rotate file every 1M rows
        if row_in_file >= ROWS_PER_FILE:
            fout.close()
            file_index += 1
            row_in_file = 0
            fout, writer = open_new_file(file_index)

        if len(row) >= max_col_index + 1:
            cleaned = [row[idx].strip() for idx, _ in COLUMNS]
            writer.writerow(cleaned)
            row_in_file += 1

        # progress every 100k rows
        if processed % 100_000 == 0:
            percent = (processed / TOTAL_ROWS) * 100
            elapsed = time.time() - start_time
            speed = int(processed / elapsed)
            print(
                f"Processed {processed:,} / {TOTAL_ROWS:,} "
                f"({percent:.2f}%) | {speed:,} rows/sec",
                flush=True
            )

    fout.close()

elapsed = time.time() - start_time
print(f"\nDone. {processed:,} rows processed in {elapsed:.1f} seconds.")
print(f"Created {file_index} output files.")
