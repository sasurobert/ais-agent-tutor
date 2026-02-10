#!/bin/bash

# Configuration
COURSE_FILES=("math_course.json" "science_course.json" "history_course.json")
MODULES_MATH=("math_ch4" "math_ch5" "math_ch9")
MODULES_SCIENCE=("science_ch4" "science_ch8" "science_ch23")
MODULES_HISTORY=("history_ch7" "history_ch9" "history_ch15")
PANELS_PER_CHAPTER=8

# Function to generate panels for a module
generate_chapter() {
    COURSE=$1
    MODULE=$2
    echo "Processing $MODULE from $COURSE..."
    
    for i in $(seq 1 $PANELS_PER_CHAPTER); do
        echo "--> Generating Panel $i for $MODULE..."
        timeout 60s npx tsx src/scripts/generate-comic-art.ts --course "$COURSE" --module "$MODULE" --panel "$i"
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -ne 0 ]; then
            echo "❌ Failed to generate Panel $i (Exit code: $EXIT_CODE)"
        else
            echo "✅ Panel $i complete"
        fi
        
        # Small delay to respect rate limits
        sleep 5
    done
}

# Run pipeline
echo "🎨 Starting Comic Art Pipeline (72 panels)"
echo "----------------------------------------"

cd /Users/user/TheAISchoolOS/ais-agent-tutor || exit 1

# Math
for mod in "${MODULES_MATH[@]}"; do
    npx dotenv -e ../.env.demo -- bash -c "npx tsx src/scripts/generate-comic-art.ts --course math_course.json --module $mod --panel 1"
    # Call the loop function inside dotenv context? No, easier to just wrap the whole thing.
done

# Actually, let's just loop and call npx dotenv each time for simplicity
for mod in "${MODULES_MATH[@]}"; do
    echo "📖 Math: $mod"
    for p in $(seq 1 8); do
        npx dotenv -e ../.env.demo -- npx tsx src/scripts/generate-comic-art.ts --course math_course.json --module "$mod" --panel "$p"
        sleep 5
    done
done

for mod in "${MODULES_SCIENCE[@]}"; do
    echo "📖 Science: $mod"
    for p in $(seq 1 8); do
        npx dotenv -e ../.env.demo -- npx tsx src/scripts/generate-comic-art.ts --course science_course.json --module "$mod" --panel "$p"
        sleep 5
    done
done

for mod in "${MODULES_HISTORY[@]}"; do
    echo "📖 History: $mod"
    for p in $(seq 1 8); do
        npx dotenv -e ../.env.demo -- npx tsx src/scripts/generate-comic-art.ts --course history_course.json --module "$mod" --panel "$p"
        sleep 5
    done
done

echo "----------------------------------------"
echo "🎉 Pipeline complete!"
