BASE=/Users/norman/Projects/BioASQ
for f in `ls $1`; do
    node merge_test.js -q $1/$f -c $BASE/Data/common_questions.json -m $BASE/Data/common_pairs.json
done
