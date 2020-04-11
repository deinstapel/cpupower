#!/bin/bash

# adapted from https://gist.github.com/siddharthkrish/32072e6f97d7743b1a7c47d76d2cb06c

echo -n "Checking git for pending changes... " >&2
if [ "$(git status --porcelain | wc -l)" -gt 0 ]
then
    echo "not clean - aborting" >&2
    exit 1
fi
echo "clean"

semver="$1"
major=0
minor=0
patch=0

old_version="$semver"

# break down the version number into it's components
regex="([0-9]+).([0-9]+).([0-9]+)"
if [[ "$semver" =~ $regex ]]
then
    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"
fi

while true
do
    echo -n "Please specify part to increment [major|minor|patch]: " >&2
    read -r ans
    case "$ans" in
        major|majo|maj|ma)
            major=$(echo "$major" + 1 | bc)
            break
            ;;
        minor|mino|min|mi)
            minor=$(echo "$minor" + 1 | bc)
            break
            ;;
        patch|patc|pat|pa|p)
            patch=$(echo "$patch" + 1 | bc)
            break
            ;;
        *)
            echo "Invalid selection '$ans'. Please try again!" >&2
            ;;
    esac
done

semver="${major}.${minor}.${patch}"

echo -n "Update version to $semver? [y/N] " >&2
read -r -n1 ans

case "$ans" in
    y|Y)
        echo
        ;;
    *)
        echo
        echo "Aborting..."
        exit 2
        ;;
esac

echo "Updating version to $semver..." >&2

grep --exclude="${BASH_SOURCE[0]}" -l -Z -r -e 'VERSION=' -e 'name="version"' | xargs -0 -l \
     sed -i -e "s;VERSION=\".*\";VERSION=\"$semver\";g" \
		        -e "s;<property name=\"version\">.*</property>;<property name=\"version\">$semver</property>;g"

make package

git add -A
git commit -s -m "(make-release) Update version from ${old_version} to ${semver}"
git push origin master:master

git tag -sm "Update version to $semver" "v$semver"
git push --tags
