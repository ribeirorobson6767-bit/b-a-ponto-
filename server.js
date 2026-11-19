const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORTA = process.env.PORT || 3000;
const ARQUIVO_DADOS = path.join(__dirname, 'dados.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function lerDados() {
  if (!fs.existsSync(ARQUIVO_DADOS)) return [];
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_DADOS, 'utf8'));
  } catch {
    return [];
  }
}

function salvarDados(lista) {
  fs.writeFileSync(ARQUIVO_DADOS, JSON.stringify(lista, null, 2));
}

app.post('/api/simulacoes', (req, res) => {
  const { nome, email, categoria, valorFatura } = req.body;
  const pontosCalculados = Math.floor((Number(valorFatura) || 0) * 2);
  const lista = lerDados();

  const novoRegistro = {
    id: lista.length + 1,
    nome: nome || 'Visitante',
    email: email || '-',
    categoria: categoria || 'Padrão',
    valorFatura: Number(valorFatura) || 0,
    pontos: pontosCalculados,
    data: new Date().toLocaleString('pt-BR')
  };

  lista.unshift(novoRegistro);
  salvarDados(lista);

  res.json({ sucesso: true, pontos: pontosCalculados, registro: novoRegistro });
});

app.get('/api/simulacoes', (req, res) => {
  res.json(lerDados());
});

app.get('/admin', (req, res) => {
  const lista = lerDados();
  const linhas = lista.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.nome}</td>
      <td>${item.email}</td>
      <td>${item.categoria}</td>
      <td>R$ ${item.valorFatura.toFixed(2)}</td>
      <td><strong>${item.pontos} pts</strong></td>
      <td>${item.data}</td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Painel de Simulações</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; background: #f8f9fa; }
        h1 { color: #cc092f; }
        table { width: 100%; border-collapse: collapse; background: #fff; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #cc092f; color: #fff; }
      </style>
    </head>
    <body>
      <h1>Histórico de Simulações de Pontos</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Categoria</th>
            <th>Valor Fatura</th>
            <th>Pontos</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr><td colspan="7">Nenhuma simulação registrada ainda.</td></tr>'}</tbody>
      </table>
    </body>
    </html>
  `);
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA}`);
});
