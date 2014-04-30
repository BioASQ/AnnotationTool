services=(
    'http://www.gopubmed.org/web/bioasq/doid/json'
    'http://www.gopubmed.org/web/bioasq/go/json'
    'http://www.gopubmed.org/web/bioasq/jochem/json'
    'http://www.gopubmed.org/web/bioasq/mesh/json'
    'http://www.gopubmed.org/web/bioasq/uniprot/json'
)

total=${#services[*]}
for ((i=0; i<$total; i++)) do
    curl `curl ${services[i]}` \
         -i \
         --data 'json={"findEntities":["mitofusin 2 receptor parkin"]}'
done

curl `curl http://www.gopubmed.org/web/bioasq/jochem/json` -i --data 'json={"findEntities":["mitofusin 2 receptor parkin"]}'
