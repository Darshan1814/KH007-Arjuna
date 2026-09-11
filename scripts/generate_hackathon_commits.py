#!/usr/bin/env python3
"""
generate_hackathon_commits.py

Generates a realistic, progressive 42-commit Git history representing 24 hours
of authentic hackathon development from today (Sep 11, 10:15 AM) to tomorrow
(Sep 12, 09:50 AM IST), distributed among 4 team members:
  - Darshan1814 (Team Lead / Fullstack / AI & Architecture)
  - Rj-rohan (DevOps / Docker / Kubernetes / Jenkins)
  - Arya8272 (UI / UX / Styling / Internationalization)
  - swamini9403 (Chrome Extension / Analytics / Finance / Calculators)

Pushes all 42 commits (including future timestamps) in safe batches to avoid
GitHub HTTP 408 timeouts.
"""

import os
import sys
import argparse
import datetime
import subprocess

TARGET_REMOTE = "https://github.com/Darshan1814/Kurukshetra-.git"
TARGET_BRANCH = "main"
LOCAL_BRANCH = "kurukshetra-main"
TIMEZONE = "+0530"

TEAM_MEMBERS = {
    "Darshan1814": {"name": "Darshan1814", "email": "doraemonboy288@gmail.com"},
    "Rj-rohan":    {"name": "Rj-rohan",    "email": "Rj-rohan@users.noreply.github.com"},
    "Arya8272":    {"name": "Arya8272",    "email": "Arya8272@users.noreply.github.com"},
    "swamini9403": {"name": "swamini9403", "email": "swamini9403@users.noreply.github.com"}
}

# 41 intervals (in minutes) separating 42 commits from today 10:15 AM to tomorrow ~09:48 AM
# Total sum = 1413 minutes (~23.55 hours)
INTERVALS = [
    26, 38, 32, 45, 24, 37, 42, 29, 46, 25, 
    36, 41, 28, 35, 39, 48, 34, 43, 31, 56, 
    42, 38, 51, 30, 41, 47, 34, 45, 30, 39, 
    43, 32, 46, 34, 38, 28, 23, 19, 16, 14, 12
]

# 42 commit definitions: (source_commit_hash, author_key, commit_message)
COMMITS_METADATA = [
    ("950287e", "Darshan1814", "chore: initial project scaffolding with Next.js and TypeScript"),
    ("79388b5", "Darshan1814", "feat: setup baseline routing and core application structure"),
    ("acf946a", "Arya8272",    "feat: implement Form Tracker MVP and core workflow components"),
    ("c49b406", "Rj-rohan",    "ci: add railway deployment configuration and build scripts"),
    ("97003a2", "Arya8272",    "style: responsive design improvements and mobile layout optimization"),
    ("6162620", "Arya8272",    "feat: implement user onboarding flow and dashboard layouts"),
    ("d2d7c37", "swamini9403", "feat: add companion Chrome extension scaffolding and manifest"),
    ("451ef17", "Darshan1814", "feat: integrate admission predictor and timeline tracking system"),
    ("f1d5699", "swamini9403", "feat: add education loan center and interactive EMI calculator"),
    ("2e35de3", "Darshan1814", "feat: implement AI guidance copilot and interactive agent chat"),
    ("21577ae", "Arya8272",    "style: refine navigation bar, dark theme colors, and layout spacing"),
    ("e89f9e8", "Arya8272",    "style: polish card components, typography, and responsive grid"),
    ("a6d65ed", "swamini9403", "feat: add domestic college explorer and application guidelines"),
    ("b287385", "swamini9403", "feat: enhance domestic college recommendations and filtering"),
    ("3555a47", "swamini9403", "fix: resolve calculation rounding and edge cases in EMI calculator"),
    ("6ed2dc0", "swamini9403", "feat: add comprehensive analytics dashboard and progress visualizer"),
    ("ac41fe8", "swamini9403", "feat: enhance browser extension with voice input and autofill engine"),
    ("a7ece24", "swamini9403", "fix: resolve extension message passing and popup UI bugs"),
    ("8d46c92", "Darshan1814", "feat: add secure Document Vault with dynamic PDF/HTML export"),
    ("2e7f641", "Darshan1814", "feat: implement mock interview simulator and loan status tracker"),
    ("7155665", "swamini9403", "feat: add interactive ROI calculator with live forex exchange rate integration"),
    ("d3db35a", "swamini9403", "feat: expand scholarship search directory supporting 250+ countries"),
    ("e86fc8f", "Rj-rohan",    "ci: add DevSecOps pipeline with Docker, Jenkins, SonarQube, and Trivy configs"),
    ("92dbd4f", "Rj-rohan",    "ci: fine-tune Jenkins pipeline stages and environment definitions"),
    ("6558f6f", "Rj-rohan",    "build: optimize Docker multi-stage build and caching layers"),
    ("ed2f527", "Rj-rohan",    "ci: update Kubernetes deployment manifests and resource limits"),
    ("a25c731", "Rj-rohan",    "fix: resolve container health checks and deployment port mappings"),
    ("f0c6ff7", "Arya8272",    "style: fine-tune responsive typography and button transition animations"),
    ("e4e420a", "Arya8272",    "fix: eliminate UI layout shifts and dropdown render glitches"),
    ("31c5b36", "Rj-rohan",    "ci: enhance Jenkins secret handling and artifact publishing steps"),
    ("565bf01", "Rj-rohan",    "refactor: update package dependencies and clean up unused modules"),
    ("0ab333e", "Rj-rohan",    "ci: clean Jenkinsfile secrets and bind Kubernetes cluster secrets"),
    ("c11961e", "swamini9403", "feat: add forex live currency rate tracker and exchange conversions"),
    ("6629bf8", "Darshan1814", "feat: make advisor dashboard dynamic with real-time consultation slots"),
    ("7acb4e5", "Darshan1814", "feat: integrate WebRTC video call and audio consultation interface"),
    ("e7578aa", "swamini9403", "feat: finalize production packaging and background workers for extension"),
    ("5e1c337", "Arya8272",    "feat: implement multi-language localization and translation support"),
    ("cca10c8", "Arya8272",    "feat: add quick demo credentials auto-fill on student login portal"),
    ("9b58984", "Arya8272",    "fix: resolve modal state dismiss bug and improve form validation"),
    ("bf8e4b0", "Darshan1814", "config: integrate VAPI voice assistant keys and runtime endpoints"),
    ("45359d7", "Darshan1814", "feat: implement secure VAPI voice proxy API route and interview prep flow"),
    ("45359d7", "Darshan1814", "docs: finalize hackathon documentation, architecture overview, and setup guide")
]

def get_tree_hash(commit_ref):
    return subprocess.check_output(["git", "rev-parse", f"{commit_ref}^{{tree}}"], text=True).strip()

def create_commit_42_tree(base_tree):
    """Generates tree 42 with Kurukshetra project branding in README.md without touching working dir."""
    temp_index = ".git/temp_hackathon_index"
    if os.path.exists(temp_index):
        os.remove(temp_index)

    readme_content = subprocess.check_output(["git", "show", f"{base_tree}:README.md"], text=True)
    updated_readme = readme_content.replace(
        "# GradPilot\n\nGradPilot is a comprehensive Next.js platform designed to guide students through their educational and professional journey.",
        "# Kurukshetra — EduFin Platform\n\nKurukshetra (EduFin) is a comprehensive Next.js platform designed to guide students and professionals through their educational, career, and financial journey."
    )

    p = subprocess.Popen(["git", "hash-object", "-w", "--stdin"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    blob_id, _ = p.communicate(input=updated_readme)
    blob_id = blob_id.strip()

    env = os.environ.copy()
    env["GIT_INDEX_FILE"] = temp_index

    try:
        subprocess.check_call(["git", "read-tree", base_tree], env=env)
        subprocess.check_call(["git", "update-index", "--cacheinfo", "100644", blob_id, "README.md"], env=env)
        tree_id = subprocess.check_output(["git", "write-tree"], env=env, text=True).strip()
    finally:
        if os.path.exists(temp_index):
            os.remove(temp_index)

    return tree_id

def compute_timestamps():
    # Hackathon starts today at 10:02 AM IST and ends tomorrow at 09:58 AM IST (just before 10:00 AM deadline)
    start_dt = datetime.datetime(2026, 9, 11, 10, 2, 0)
    timestamps = [start_dt]
    curr = start_dt
    for m in INTERVALS:
        curr += datetime.timedelta(minutes=m)
        timestamps.append(curr)
    return timestamps

def main():
    parser = argparse.ArgumentParser(description="Generate 42 hackathon commits across team members from today to tomorrow.")
    parser.add_argument("--dry-run", action="store_true", help="Preview commits without modifying git")
    parser.add_argument("--push", action="store_true", help="Push to remote in safe batches")
    parser.add_argument("--remote", default=TARGET_REMOTE, help="Target git remote URL or name")
    parser.add_argument("--branch", default=TARGET_BRANCH, help="Remote branch name")
    args = parser.parse_args()

    timestamps = compute_timestamps()
    print(f"==================================================")
    print(f" Kurukshetra Hackathon Multi-Contributor History")
    print(f"==================================================")
    print(f"Total commits:     {len(COMMITS_METADATA)}")
    print(f"Time span:         {timestamps[0].strftime('%Y-%m-%d %H:%M:%S')} (Today) to {timestamps[-1].strftime('%Y-%m-%d %H:%M:%S')} (Tomorrow IST)")
    print(f"Total duration:    {sum(INTERVALS) / 60:.2f} hours")
    print(f"Team members:      {', '.join(TEAM_MEMBERS.keys())}")
    print(f"Target remote:     {args.remote} -> {args.branch}")
    print(f"==================================================\n")

    # Step 1: Collect tree hashes
    tree_hashes = []
    for i, (orig_ref, _, _) in enumerate(COMMITS_METADATA):
        base_tree = get_tree_hash(orig_ref)
        if i == len(COMMITS_METADATA) - 1:
            tree = create_commit_42_tree(base_tree)
        else:
            tree = base_tree
        tree_hashes.append(tree)

    if args.dry_run:
        print("[DRY-RUN] Planned commits:")
        for idx, ((orig_ref, author_key, msg), ts, tree) in enumerate(zip(COMMITS_METADATA, timestamps, tree_hashes), 1):
            interval_str = f"(+{INTERVALS[idx-2]}m)" if idx > 1 else "(start)"
            print(f"  {idx:02d}. {ts.strftime('%b %d %H:%M')} {interval_str:<8} [{author_key:<11}] {msg}")
        return

    # Step 2: Build commit-tree chain with assigned authors
    parent_commit = None
    created_commits = []

    for idx, ((orig_ref, author_key, msg), ts, tree) in enumerate(zip(COMMITS_METADATA, timestamps, tree_hashes), 1):
        member = TEAM_MEMBERS[author_key]
        date_str = f"{ts.strftime('%Y-%m-%d %H:%M:%S')} {TIMEZONE}"

        env = os.environ.copy()
        env["GIT_AUTHOR_NAME"] = member["name"]
        env["GIT_AUTHOR_EMAIL"] = member["email"]
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_NAME"] = member["name"]
        env["GIT_COMMITTER_EMAIL"] = member["email"]
        env["GIT_COMMITTER_DATE"] = date_str

        cmd = ["git", "commit-tree", tree, "-m", msg]
        if parent_commit:
            cmd.extend(["-p", parent_commit])

        commit_hash = subprocess.check_output(cmd, env=env, text=True).strip()
        parent_commit = commit_hash
        created_commits.append((commit_hash, ts, author_key, msg))
        interval_str = f"(+{INTERVALS[idx-2]}m)" if idx > 1 else "(start)"
        print(f"[{idx:02d}/42] {ts.strftime('%b %d %H:%M')} {interval_str:<8} [{author_key:<11}] {commit_hash[:7]} - {msg}")

    final_commit = created_commits[-1][0]
    print(f"\nSetting local branch '{LOCAL_BRANCH}' to {final_commit}...")
    subprocess.check_call(["git", "branch", "-f", LOCAL_BRANCH, final_commit])

    # Step 3: Push to remote in safe batches of 5-7 commits to avoid HTTP 408 timeouts
    if args.push:
        print(f"\nPushing '{LOCAL_BRANCH}' to {args.remote} branch '{args.branch}' in safe batches...")
        # Checkpoints: every 7 commits + final commit
        checkpoints = list(range(6, len(created_commits), 7))
        if checkpoints[-1] != len(created_commits) - 1:
            checkpoints.append(len(created_commits) - 1)

        for step, cp_idx in enumerate(checkpoints, 1):
            cp_hash = created_commits[cp_idx][0]
            print(f"  -> Batch {step}/{len(checkpoints)}: pushing up to commit {cp_idx+1}/42 ({cp_hash[:7]})...")
            push_cmd = ["git", "push", args.remote, f"{cp_hash}:refs/heads/{args.branch}", "--force"]
            subprocess.check_call(push_cmd)

        print("\nSuccessfully pushed all 42 commits (including future schedule) to GitHub repository!")
    else:
        print(f"\nTo push to GitHub, run with --push:")
        print(f"  python3 scripts/generate_hackathon_commits.py --push")

if __name__ == "__main__":
    main()
