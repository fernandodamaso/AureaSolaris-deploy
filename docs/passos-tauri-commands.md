# Passos para Adicionar Comandos Tauri em src-tauri/src/lib.rs

## Objetivo
Implementar os 10 novos comandos Tauri necessários para a persistência do Diario conforme especificado no design:
- diary_create_entry
- diary_update_entry
- diary_delete_entry
- diary_list_entries
- diary_get_entry
- diary_create_folder
- diary_list_folders
- diary_delete_folder
- diary_save_tabs
- diary_load_tabs

## Passos Detalhados

### 1. Preparação
- [ ] Abrir arquivo `src-tauri/src/lib.rs`
- [ ] Revisar comandos Tauri existentes para entender o padrão
- [ ] Garantir que as dependências necessárias estejam no Cargo.toml (serde, etc.)

### 2. Estrutura de Diretórios e Arquivos
- [ ] Confirmar/criar estrutura de diretórios para persistência:
  ```
  memory/diary/
    folders.json
    entries/
      {uuid}.json
    tabs.json
  ```
- [ ] O diretório `memory/` deve estar no escopo permitido do Tauri (tauri.conf.json)

### 3. Definição de Estruturas de Dados Rust
- [ ] Definir structs para representar os dados (usando Serde para serialização):
  ```rust
  use serde::{Deserialize, Serve};
  use std::fs;
  use std::path::PathBuf;
  
  #[derive(Debug, Serialize, Deserialize)]
  pub struct DiaryEntry {
      pub id: String,
      pub title: String,
      pub content: String, // TipTap JSON stringificado
      pub folder_id: String,
      pub created_at: String, // ISO 8601
      pub updated_at: String, // ISO 8601
      pub word_count: usize,
  }
  
  #[derive(Debug, Serialize, Deserialize)]
  pub struct DiaryFolder {
      pub id: String,
      pub name: String,
      pub icon: String, // emoji
      pub order: usize,
      pub created_at: String, // ISO 8601
  }
  
  #[derive(Debug, Serialize, Deserialize)]
  pub struct DiaryTabsState {
      pub open_tab_ids: Vec<String>,
      pub active_tab_id: Option<String>,
  }
  ```

### 4. Funções Auxiliares para Manipulação de Arquivos
- [ ] Implementar função para obter diretório base do diário:
  ```rust
  fn get_diary_dir() -> Result<PathBuf, String> {
      let mut dir = tauri::api::path::local_data_dir().ok_or("Não foi possível obter diretório de dados local")?;
      dir.push("memory/diary");
      fs::create_dir_all(&dir).map_err(|e| format!("Falha ao criar diretório do diário: {}", e))?;
      Ok(dir)
  }
  ```
- [ ] Implementar função para obter caminho de uma entrada específica:
  ```rust
  fn get_entry_path(entry_id: &str) -> Result<PathBuf, String> {
      let mut path = get_diary_dir()?;
      path.push("entries");
      path.push(format!("{}.json", entry_id));
      Ok(path)
  }
  ```
- [ ] Implementar função para obter caminho do arquivo de pastas:
  ```rust
  fn get_folders_path() -> Result<PathBuf, String> {
      let mut path = get_diary_dir()?;
      path.push("folders.json");
      Ok(path)
  }
  ```
- [ ] Implementar função para obter caminho do arquivo de abas:
  ```rust
  fn get_tabs_path() -> Result<PathBuf, String> {
      let mut path = get_diary_dir()?;
      path.push("tabs.json");
      Ok(path)
  }
  ```

### 5. Implementação dos Comandos Tauri

#### 5.1 diary_create_entry
```rust
#[tauri::command]
pub fn diary_create_entry(title: String, folder_id: String) -> Result<DiaryEntry, String> {
    let entry_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    let entry = DiaryEntry {
        id: entry_id.clone(),
        title,
        content: "".to_string, // Começa vazio
        folder_id,
        created_at: now.clone(),
        updated_at: now.clone(),
        word_count: 0,
    };
    
    // Salvar entrada no arquivo
    let entry_path = get_entry_path(&entry_id)?;
    let json = serde_json::to_string_pretty(&entry)
        .map_err(|e| format!("Falha ao serializar entrada: {}", e))?;
    fs::write(&entry_path, json)
        .map_err(|e| format!("Falha ao salvar entrada: {}", e))?;
    
    Ok(entry)
}
```

#### 5.2 diary_update_entry
```rust
#[tauri::command]
pub fn diary_update_entry(
    id: String,
    title: Option<String>,
    content: Option<String>,
    folder_id: Option<String>
) -> Result<DiaryEntry, String> {
    // Carregar entrada existente
    let entry_path = get_entry_path(&id)?;
    let mut entry: DiaryEntry = fs::read_to_string(&entry_path)
        .map_err(|e| format!("Falha ao ler entrada: {}", e))?
        .parse::<serde_json::Value>()
        .map_err(|e| format!("Falha ao parsear entrada JSON: {}", e))?
        .serde_deserialize()
        .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
    
    // Atualizar campos fornecidos
    if let Some(t) = title {
        entry.title = t;
    }
    if let Some(c) = content {
        entry.content = c;
        // Atualizar contagem de palavras
        entry.word_count = c.split_whitespace().count();
    }
    if let Some(f) = folder_id {
        entry.folder_id = f;
    }
    entry.updated_at = chrono::Utc::now().to_rfc3339();
    
    // Salvar entrada atualizada
    let json = serde_json::to_string_pretty(&entry)
        .map_err(|e| format!("Falha ao serializar entrada atualizada: {}", e))?;
    fs::write(&entry_path, json)
        .map_err(|e| format!("Falha ao salvar entrada atualizada: {}", e))?;
    
    Ok(entry)
}
```

#### 5.3 diary_delete_entry
```rust
#[tauri::command]
pub fn diary_delete_entry(id: String) -> Result<(), String> {
    let entry_path = get_entry_path(&id)?;
    fs::remove_file(&entry_path)
        .map_err(|e| format!("Falha ao excluir entrada: {}", e))?;
    Ok(())
}
```

#### 5.4 diary_list_entries
```rust
#[tauri::command]
pub fn diary_list_entries(folder_id: Option<String>) -> Result<Vec<DiaryEntry>, String> {
    let diary_dir = get_diary_dir()?;
    let entries_dir = diary_dir.join("entries");
    
    // Verificar se o diretório de entradas existe
    if !entries_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut entries = Vec::new();
    
    // Ler todos os arquivos JSON no diretório de entradas
    for entry in fs::read_dir(&entries_dir)
        .map_err(|e| format!("Falha ao ler diretório de entradas: {}", e))?
    {
        let entry_path = entry
            .map_err(|e| format!("Falha ao obter entrada do diretório: {}", e))?
            .path();
        
        if entry_path.extension().and_then(|s| s.to_str()) == Some("json") {
            let entry_data = fs::read_to_string(&entry_path)
                .map_err(|e| format!("Falha ao ler arquivo de entrada: {}", e))?;
            
            let entry: DiaryEntry = serde_json::from_str(&entry_data)
                .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
            
            // Filtrar por pasta se especificado
            if let Some(ref folder_id) = folder_id {
                if entry.folder_id == *folder_id {
                    entries.push(entry);
                }
            } else {
                entries.push(entry);
            }
        }
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(entries)
}
```

#### 5.5 diary_get_entry
```rust
#[tauri::command]
pub fn diary_get_entry(id: String) -> Result<Option<DiaryEntry>, String> {
    let entry_path = get_entry_path(&id)?;
    
    if !entry_path.exists() {
        return Ok(None);
    }
    
    let entry_data = fs::read_to_string(&entry_path)
        .map_err(|e| format!("Falha ao ler arquivo de entrada: {}", e))?;
    
    let entry: DiaryEntry = serde_json::from_str(&entry_data)
        .map_err(|e| format!("Falha ao desserializar entrada: {}", e))?;
    
    Ok(Some(entry))
}
```

#### 5.6 diary_create_folder
```rust
#[tauri::command]
pub fn diary_create_folder(name: String, icon: String) -> Result<DiaryFolder, String> {
    let folder_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Carregar pastas existentes para determinar ordem
    let mut folders = diary_list_folders()?;
    let order = folders.len();
    
    let folder = DiaryFolder {
        id: folder_id.clone(),
        name,
        icon,
        order,
        created_at: now.clone(),
    };
    
    // Adicionar nova pasta à lista
    folders.push(folder.clone());
    
    // Salvar lista atualizada de pastas
    let folders_path = get_folders_path()?;
    let json = serde_json::to_string_pretty(&folders)
        .map_err(|e| format!("Falha ao serializar pastas: {}", e))?;
    fs::write(&folders_path, json)
        .map_err(|e| format!("Falha ao salvar pastas: {}", e))?;
    
    Ok(folder)
}
```

#### 5.7 diary_list_folders
```rust
#[tauri::command]
pub fn diary_list_folders() -> Result<Vec<DiaryFolder>, String> {
    let folders_path = get_folders_path()?;
    
    // Se o arquivo não existir, retornar lista vazia (será tratado no frontend)
    if !folders_path.exists() {
        return Ok(Vec::new());
    }
    
    let folders_data = fs::read_to_string(&folders_path)
        .map_err(|e| format!("Falha ao ler arquivo de pastas: {}", e))?;
    
    let folders: Vec<DiaryFolder> = serde_json::from_str(&folders_data)
        .map_err(|e| format!("Falha ao desserializar pastas: {}", e))?;
    
    Ok(folders)
}
```

#### 5.8 diary_delete_folder
```rust
#[tauri::command]
pub fn diary_delete_folder(id: String) -> Result<(), String> {
    // Carregar pastas
    let mut folders = diary_list_folders()?;
    
    // Encontrar a pasta a ser excluída
    let folder_index = folders
        .iter()
        .position(|f| f.id == id)
        .ok_or_else(|| "Pasta não encontrada".to_string())?;
    
    let folder_to_delete = folders.remove(folder_index);
    
    // Proteger a pasta "Geral" padrão
    if folder_to_delete.name == "Geral" && folder_to_delete.icon == "📓" {
        return Err("Não é permitido excluir a pasta Geral padrão".to_string());
    }
    
    // Mover entradas da pasta excluída para "Geral"
    let geral_folder = folders
        .iter()
        .find(|f| f.name == "Geral" && f.icon == "📓")
        .ok_or_else(|| "Pasta Geral não encontrada".to_string())?;
    
    let mut entries = diary_list_entries(None)?;
    for entry in &mut entries {
        if entry.folder_id == id {
            entry.folder_id = geral_folder.id.clone();
            // Atualizar entrada com nova pasta
            diary_update_entry(
                entry.id.clone(),
                None,
                None,
                Some(geral_folder.id.clone())
            )?;
        }
    }
    
    // Atualizar ordens das pastas restantes
    for (i, folder) in folders.iter_mut().enumerate() {
        folder.order = i;
    }
    
    // Salvar lista atualizada de pastas
    let folders_path = get_folders_path()?;
    let folders_json = serde_json::to_string_pretty(&folders)
        .map_err(|e| format!("Falha ao serializar pastas: {}", e))?;
    fs::write(&folders_path, folders_json)
        .map_err(|e| format!("Falha ao salvar pastas: {}", e))?;
    
    Ok(())
}
```

#### 5.9 diary_save_tabs
```rust
#[tauri::command]
pub fn diary_save_tabs(open_ids: Vec<String>, active_id: Option<String>) -> Result<(), String> {
    let tabs_state = DiaryTabsState {
        open_tab_ids: open_ids,
        active_tab_id: active_id,
    };
    
    let tabs_path = get_tabs_path()?;
    let json = serde_json::to_string_pretty(&tabs_state)
        .map_err(|e| format!("Falha ao serializar estado das abas: {}", e))?;
    fs::write(&tabs_path, json)
        .map_err(|e| format!("Falha ao salvar estado das abas: {}", e))?;
    
    Ok(())
}
```

#### 5.10 diary_load_tabs
```rust
#[tauri::command]
pub fn diary_load_tabs() -> Result<DiaryTabsState, String> {
    let tabs_path = get_tabs_path()?;
    
    // Se o arquivo não existir, retornar estado padrão
    if !tabs_path.exists() {
        return Ok(DiaryTabsState {
            open_tab_ids: Vec::new(),
            active_tab_id: None,
        });
    }
    
    let tabs_data = fs::read_to_string(&tabs_path)
        .map_err(|e| format!("Falha ao ler arquivo de abas: {}", e))?;
    
    let tabs_state: DiaryTabsState = serde_json::from_str(&tabs_data)
        .map_err(|e| format!("Falha ao desserializar estado das abas: {}", e))?;
    
    Ok(tabs_state)
}
```

### 6. Atualizações no Cargo.toml
- [ ] Verificar se as seguintes dependências estão presentes:
  ```toml
  [dependencies]
  serde = { version = "1.0", features = ["derive"] }
  serde_json = "1.0"
  uuid = { version = "1.0", features = ["v4"] }
  chrono = { version = "0.4", features = ["serde"] }
  ```
- [ ] Adicionar dependências faltantes se necessário

### 7. Considerações de Segurança
- [ ] Validar todos os inputs para prevenir path traversal attacks
- [ ] Garantir que todos os caminhos de arquivo fiquem dentro do diretório permitido
- [ ] Considerar limitar o tamanho do conteúdo das entradas para evitar DoS

### 8. Tratamento de Erros
- [ ] Padronizar mensagens de erro para serem claras e úteis para o frontend
- [ ] Logar erros internos para depuração (mas não expor detalhes sensíveis ao frontend)
- [ ] Retornar Result<T, String> para todos os comandos como padrão do projeto

### 9. Testes dos Comandos
- [ ] Testar cada comando individualmente
- [ ] Testar fluxos completos (criar pasta -> criar entrada -> atualizar entrada -> excluir entrada -> excluir pasta)
- [ ] Testar casos de borda (pastas vazias, entradas inexistentes, etc.)
- [ ] Verificar persistência entre reinicializações da aplicação

### 10. Integração com o Frontend
- [ ] Garantir que os nomes dos comandos correspondam exatamente aos esperados no frontend
- [ ] Verificar que os tipos de retorno sejam compatíveis com as interfaces TypeScript
- [ ] Confirmar que o formato de data (ISO 8601/RFC 3339) seja consistente

## Observações Importantes

### Sobre o Diretório de Dados
- O diretório `memory/diary` deve estar configurado em `tauri.conf.json` dentro da lista de permissoes de filesystem
- Exemplo de configuração em tauri.conf.json:
  ```json
  {
    "tauri": {
      "allowlist": {
        "fs": {
          "scope": [
            "$APPDATA/*/memory/diary/**",
            "$HOME/Library/Application Support/*/memory/diary/**",
            "$HOME/.local/share/*/memory/diary/**"
          ]
        }
      }
    }
  }
  ```

### Sobre IDs
- Usar UUIDs versão 4 para garantir unicidade
- O frontend deve gerar UUIDs para novas entradas/pastas ou o backend pode fazer isso (no nosso caso, o backend gera)

### Sobre Formato de Data
- Usar formato RFC 3339/ISO 8601 para consistência com JavaScript Date
- Exemplos: "2026-03-26T14:30:00Z"

### Sobre Conteúdo do Editor
- O conteúdo será armazenado como JSON stringificado do TipTap
- O frontend é responsável por serializar/desserializar o conteúdo do editor
- O backend apenas armazena e recupera a string exatamente como recebida