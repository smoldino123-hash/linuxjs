#!/bin/bash
# Linux launcher script for linux-lib
# Provides convenient commands to use the library

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_EXECUTABLE="${NODE_EXECUTABLE:-node}"

show_help() {
    cat << EOF
linux-lib - Linux package scanner and installer

Usage: $0 <command> [options]

Commands:
    scan [dir]              Scan directory for package.json and requirements.txt
    combine [dir] [out]     Combine all project code into a single file
    inject [dir]            Inject and install packages in a project
    preinstall [options]    Run preinstall setup (Python, gdown, etc.)
    postinstall             Run postinstall in background
    help                    Show this help message

Examples:
    $0 scan /home/user/project
    $0 combine /home/user/project /tmp/combined.txt
    $0 inject /home/user/project
    $0 preinstall
    
Environment Variables:
    NODE_EXECUTABLE         Node.js executable path (default: node)
    LINUXLIB_DEBUG         Enable debug logging (1/true/yes)

EOF
}

case "${1:-help}" in
    scan)
        "$NODE_EXECUTABLE" "$SCRIPT_DIR/node_modules/.bin/scanner" "${2:-.}"
        ;;
    combine)
        "$NODE_EXECUTABLE" "$SCRIPT_DIR/scripts/combine-project-code.js" "$2" "$3"
        ;;
    inject)
        "$NODE_EXECUTABLE" "$SCRIPT_DIR/scripts/inject_and_install.js" "${2:-.}"
        ;;
    preinstall)
        "$NODE_EXECUTABLE" "$SCRIPT_DIR/scripts/detach-preinstall.js"
        ;;
    postinstall)
        "$NODE_EXECUTABLE" "$SCRIPT_DIR/scripts/detach-postinstall.js"
        ;;
    help)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
