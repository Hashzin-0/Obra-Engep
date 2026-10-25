# Catálogo de objetos 2D/3D — fontes e licenças

O catálogo do Obra-Engep consome ativos publicados por projetos externos; não gera os desenhos dos móveis a partir de descrições próprias.

## Símbolos de planta 2D
- Fonte: [pjm4github/FloorPlanner — furnishings](https://github.com/pjm4github/FloorPlanner/tree/main/assets/furnishings).
- Quantidade usada no manifesto: 96 símbolos SVG de vista superior.
- Licença indicada no diretório: CC0 1.0.
- Os SVGs usam dimensões reais em polegadas no `viewBox`; a aplicação converte largura e profundidade para a escala da planta.

## Modelos 3D e miniaturas
- Pacote original: [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit).
- Espelho de distribuição consultado: [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets), catálogo `catalog.json`.
- Licença declarada para o pacote: CC0 1.0.
- A integração atual mapeia 32 dos 96 símbolos a modelos GLB correspondentes ou próximos disponíveis no pacote. O catálogo 3D mostra somente itens com GLB mapeado; itens sem correspondência continuam disponíveis em 2D.
- A vista 3D geral usa miniaturas dos modelos reais para manter a cena leve. O visualizador do catálogo carrega o GLB interativo sob demanda. Isso ainda não equivale a instanciar a malha GLB completa dentro da cena da planta.

## Carregamento e limites
- Símbolos SVG, miniaturas e GLBs são carregados por URLs públicas, portanto exigem conexão com a internet e podem sofrer indisponibilidade ou alteração da origem.
- Não copiamos o aplicativo comercial magicplan nem os seus ativos proprietários.
- Antes de ampliar o catálogo com outros fornecedores, verificar a licença por pacote/arquivo, formatos disponíveis, escala real, política de hotlink e atribuições necessárias.
- Os objetos inseridos guardam dimensões nominais do manifesto de origem. A biblioteca não substitui a conferência de medidas do fabricante nem o detalhamento executivo por profissional habilitado.

## MVS-Texturing
O repositório [magicplan/mvs-texturing](https://github.com/magicplan/mvs-texturing) é um fork do algoritmo MVS-Texturing, licenciado sob BSD 3-Clause. Ele texturiza malhas 3D reconstruídas a partir de imagens registradas em câmeras; não é um catálogo de móveis e não produz, por si só, modelos paramétricos para inserir na planta. Deve ser considerado futuramente apenas em um fluxo de reconstrução fotogramétrica/realismo, não como dependência do catálogo atual.
