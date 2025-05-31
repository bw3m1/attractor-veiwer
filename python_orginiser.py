# this script collects the first line from each TXT file in a specified folder
# and writes them to a new file on the desktop.
# created to ChatGPT for writing this python file

import os
from pathlib import Path

def collect_txt_lines(folder_path):
    folder = Path(folder_path)
    if not folder.exists() or not folder.is_dir():
        print("Invalid folder path.")
        return

    txt_lines = []
    for file in folder.iterdir():
        if file.is_file() and file.suffix.lower() == '.txt':
            with open(file, 'r', encoding='utf-8') as f:
                line = f.readline().strip()
                txt_lines.append(line)

    return txt_lines

def write_output(lines):
    desktop = Path.home() / 'Desktop'
    output_file = desktop / 'combined_txt_output.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')
    print(f"Output written to: {output_file}")

def main():
    folder_path = input("Enter the path to the folder containing the TXT and PNG files: ").strip()
    lines = collect_txt_lines(folder_path)
    if lines is not None:
        write_output(lines)

if __name__ == '__main__':
    main()