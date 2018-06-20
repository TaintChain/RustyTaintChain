extern crate csv;

use std::collections::{HashMap, HashSet};
use std::fs::{self, File, OpenOptions};
use std::io::{LineWriter, Write};
use std::hash::{BuildHasherDefault};
use std::path::PathBuf;
use std::cmp;

use clap::{Arg, ArgMatches, App, SubCommand};
use rustc_serialize::Decodable;
use rustc_serialize::json::{self, Json, Decoder};
use twox_hash::XxHash;

use callbacks::Callback;
use errors::{OpError, OpResult};

use blockchain::parser::types::CoinType;
use blockchain::proto::block::Block;
use blockchain::proto::Hashed;
use blockchain::proto::tx::{Tx, TxOutpoint, TxInput, TxOutput, EvaluatedTxOut};
use blockchain::utils::{arr_to_hex_swapped, hex_to_arr32_swapped};
use blockchain::utils::csv::CsvFile;
use blockchain::utils;

use std::io::{self, BufReader};
use std::io::prelude::*;
use std::path::Path;

extern crate blist;
use self::blist::BList;
use std::ptr;
use std::mem;
extern crate union_find;

//use std::collections::HashMap;
use std::fmt::*;
//use std::hash::Hash;
use std::rc::Rc;
use std::result::Result;

use unionfind::{UnionFinder, UnionFinderImpl};

extern crate chrono;
use self::chrono::*;

use std::collections::VecDeque;

use blockchain::proto::script::{ScriptEvaluator, ScriptPattern, ScriptError, eval_from_stack, eval_from_bytes};

#[derive(PartialEq, Eq, Hash, Default, Debug, RustcDecodable, RustcEncodable, Clone)]
pub struct TaintPart {
    name : u16,
    value: u64
}

#[derive(PartialEq, Eq, Default, Hash, Debug, RustcDecodable, RustcEncodable, Clone)]
pub struct AddressInfo {
    timestamp: String,
    current_balance: u64,
    tainted_balance: Option<VecDeque<TaintPart>>
}

use std::fmt;
impl fmt::Display for AddressInfo {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let yo:String = if let Some(ref x) = self.tainted_balance {
           x.iter().fold(String::new(), |acc, k| { acc + &k.name.to_string() + " " + &k.value.to_string() + ","})
        }else{
           String::from("")
        };

        write!(f, "{},{},{}",
               self.timestamp, self.current_balance, yo)
    }
}

/// Groups addresses into ownership clusters.
pub struct TaintFifo {
    dump_folder: PathBuf,
    address_info_writer: LineWriter<File>,  // The file for address information
    utxo_writer: LineWriter<File>,          // The file for utxo information
    taint_mapping_writer: LineWriter<File>, // The file for taint mapping storage
    overlap_writer: LineWriter<File>,       // The file for overlapping taint information
    utxo_set: HashMap<TxOutpoint, String, BuildHasherDefault<XxHash>>, // a map of all UTXO->string
    address_mapping: HashMap<TxOutpoint, AddressInfo, BuildHasherDefault<XxHash>>, //Mapping from the UTXO to the state of it
    bootstrap_addresses: HashMap<String, VecDeque<TaintPart>>, // Input address

    start_height: usize,
    end_height: usize,
    max_height: usize,

    address_file: String,   // Path of the list to transactions
    taint_collisions: u32,  // Number of tainted transactions
    total_taint_for_tx: VecDeque<TaintPart>, // VecDeque that keeps the taint for current transactions
    whitename: String,     // A constant name for the clean money
    dirtmapper: HashMap<String, u16> // This the translation mapper for the dirt names.
}

fn count_fragments(am: &HashMap<TxOutpoint, AddressInfo, BuildHasherDefault<XxHash>>)->usize{
    return am.iter().fold(0, |a, v| a+if let Some(ref x) = v.1.tainted_balance{x.len()}else{0});
}

fn count_accounts(am: &HashMap<TxOutpoint, AddressInfo, BuildHasherDefault<XxHash>>)->usize{
    return am.iter().fold(0, |a, v| a+if let Some(ref _x) = v.1.tainted_balance{1}else{0});
}

fn txo_to_string(txo: &TxOutpoint, utxo_set: &HashMap<TxOutpoint, String, BuildHasherDefault<XxHash>>)->String{

    if utxo_set.contains_key(txo){
        return utxo_set.get(&txo).unwrap().clone();
    }else{
        return String::from("");
    }

}

fn taint_to_sum(vdtp: &Option<VecDeque<TaintPart>>)->u64{
    if let &Some(ref x) = vdtp{
        return x.iter().fold(0, |a, v| a+&v.value); 
    }
    return 0;
}

fn non_white_taint_to_sum(vdtp: &VecDeque<TaintPart>)->u64{
    return vdtp.iter().fold(0, |acc, k| {acc + if k.name!=0{k.value}else{0}})
}


fn taint_to_string(vdtp: &Option<VecDeque<TaintPart>>)->String{
    if let &Some(ref x) = vdtp{
        return x.iter().fold(String::new(), |a, k| {a+&k.name.to_string() + " " + &k.value.to_string() + ","});
    }
    return String::from("");
}

fn inputs_to_string(vdtp: &Hashed<Tx>)->String{
        return format!("{},{}",vdtp.value.inputs.len(), vdtp.value.inputs.iter().fold(String::new(), |a, k| {a+&k.outpoint.to_string() + ","}));
}


fn extract_taint(given_taints: &mut VecDeque<TaintPart>, value: u64)->VecDeque<TaintPart>{
    let mut remaining = value;
    let mut new_tainted_balance = VecDeque::new();

    while remaining > 0{
        if given_taints.is_empty(){
            new_tainted_balance.push_back(TaintPart{name: 0, value:remaining});
            assert!(remaining != 0);
            remaining = 0;
        }else{
            let mut ctaint = given_taints.pop_front().unwrap();
            if remaining >= ctaint.value{
                assert!(ctaint.value != 0);
                remaining -= ctaint.value;
                new_tainted_balance.push_back(ctaint);
            }else{
                ctaint.value -= remaining;
                assert!(remaining != 0, "Remaining balance should not be zero");
                new_tainted_balance.push_back(TaintPart{name:ctaint.name, value:remaining});
                given_taints.push_front(ctaint);
                remaining = 0;
            }
        }
    }

    if remaining > 0{
        new_tainted_balance.push_back(TaintPart{name:0, value: remaining});
    }

    return new_tainted_balance;
}

fn combine_taints(taints: &mut VecDeque<TaintPart>, tainted_balance: &mut VecDeque<TaintPart>, mut writer_to_notify: Option<&mut LineWriter<File>>, collision_name: &String)->u32{

	let mut new_taint = VecDeque::new();
    let mut location = 0;
    let mut number_of_collisions = 0;

	while !taints.is_empty() && !tainted_balance.is_empty(){
		let mut left  = taints.pop_front().unwrap();
		let mut right = tainted_balance.pop_front().unwrap();

		// If the saved chunk is smaller
		if left.value <= right.value{
			//if left.name != 0 && right.name != 0 && left.name != right.name{
			if left.name != 0 && right.name != 0{
                number_of_collisions += 1;
                
                if let Some(ref mut x) = writer_to_notify{
                    x.write_all(format!("{},{},{},{},{}\n", left.name, right.name, cmp::min(left.value, right.value), collision_name, location).as_bytes()).unwrap();
                }
            }

			// Left taint always has precedent, but if it is empty we merge it
			// regardless
			if left.name == 0 {
				left.name = right.name;
			}

			right.value -= left.value;
            location += left.value;

			if new_taint.is_empty(){
				assert!(left.value != 0, "Trying to enter zero left");
				new_taint.push_back(left);
			}else{
				let mut nyan = new_taint.pop_back().unwrap();
				if nyan.name == left.name {
					nyan.value += left.value;
					assert!(nyan.value != 0, "The nyan value is zero");
					new_taint.push_back(nyan);
				}else{
					assert!(nyan.value != 0);
					assert!(left.value != 0);
					new_taint.push_back(nyan);
					new_taint.push_back(left);
				}
			}

			if right.value > 0{
				assert!(right.value != 0, "Right somehow became 0");
				tainted_balance.push_front(right);
			}

		}else{
			// if the new chunk is actually smaller
			// then why dont we break them down into parts 
			assert!((left.value - right.value)!=0, "Difference is zero");
			assert!(right.value != 0, "Right is zero!");
			taints.push_front(TaintPart{name: left.name, value: left.value-right.value});
			taints.push_front(TaintPart{name: left.name, value: right.value});
			tainted_balance.push_front(right);
		}
	}

    if !tainted_balance.is_empty(){
        new_taint.append(tainted_balance);
    }

    if !taints.is_empty(){
        new_taint.append(taints);
    }

    taints.append(&mut new_taint);

    return number_of_collisions;
}

fn reduce_taint(tainted_balance: &mut VecDeque<TaintPart>){

    let mut lname = 0; let mut vl=0;

    let hru = tainted_balance.drain(..).collect::<VecDeque<TaintPart>>();

    for elem in hru.iter() {
        if elem.name == lname{
            vl += elem.value;
        }else{
            if vl != 0{
                tainted_balance.push_back(TaintPart{name:lname, value:vl});
            }
            vl=elem.value;lname=elem.name;
        }
    }

    if vl!=0{tainted_balance.push_back(TaintPart{name:lname,value:vl});}

    if tainted_balance.len() == 1{
        // we check if it just consists of white chunks
        let jj = tainted_balance.pop_front().unwrap();
        if jj.name != 0{
            assert!(jj.value !=0);
            tainted_balance.push_front(jj);
        }
    }
}


impl TaintFifo {
    fn create_writer(path: PathBuf) -> OpResult<LineWriter<File>> {
        let file = match OpenOptions::new()
                  .write(true)
                  .create(true)
                  .truncate(true)
                  .open(&path) {
            Ok(f) => f,
            Err(err) => return Err(OpError::from(err)),
        };
        Ok(LineWriter::new(file))
    }

    fn export_clusters_to_csv(&mut self) -> OpResult<usize> {
        
        for (address, info) in &self.address_mapping {
            self.address_info_writer
                .write_all(format!("{},{}\n", address, info).as_bytes())
                .unwrap();
        }
        Ok(self.dirtmapper.len())
    }

    /// Exports UTXO set to a CSV file.
    fn export_utxo_set_to_csv(&mut self) -> OpResult<usize> {
        info!(target: "FIFO [export_utxo_set_to_csv]", "Exporting {} UTXOs to CSV...", self.utxo_set.len());

        for (tx_outpoint, address) in self.utxo_set.iter() {
            self.utxo_writer
                .write_all(format!("{},{},{}\n",
                                   arr_to_hex_swapped(&tx_outpoint.txid),
                                   tx_outpoint.index,
                                   address)
                    .as_bytes())
                .unwrap();
        }

        info!(target: "FIFO [export_utxo_set_to_csv]", "Exported {} UTXOs to CSV.", self.utxo_set.len());
        Ok(self.utxo_set.len())
    }

    /// Renames temporary files.
    fn rename_tmp_files(&mut self) -> OpResult<usize> {
        fs::rename(self.dump_folder.as_path().join("taint_mapper.csv.tmp"),
                   self.dump_folder.as_path().join("taint_mapper.csv"))
                .expect("Unable to rename taint mapping file");
        fs::rename(self.dump_folder.as_path().join("taint_overlap.csv.tmp"),
                   self.dump_folder.as_path().join("taint_overlap.csv"))
                .expect("Unable to rename ilias file");
        fs::rename(self.dump_folder.as_path().join("taint_timing_information.csv.tmp"),
                   self.dump_folder.as_path().join("taint_timing_information.csv"))
                .expect("Unable to rename taint_clusters.csv.tmp file!");
        fs::rename(self.dump_folder.as_path().join("taint_utxo.csv.tmp"),
                   self.dump_folder.as_path().join("taint_utxo.csv"))
                .expect("Unable to rename taint_utxo.csv.tmp file!");
        fs::rename(self.dump_folder.as_path().join("address_info.csv.tmp"),
                   self.dump_folder.as_path().join("address_info.csv"))
            .expect("Unable to rename address_info.csv.tmp file!");

        Ok(3)
    }
}

impl Callback for TaintFifo {
    fn build_subcommand<'a, 'b>() -> App<'a, 'b>
        where Self: Sized
    {
        SubCommand::with_name("taintFIFO")
            .about("Taints coins with FIFO.")
            .version("0.2")
            .author("Ilia Shumailov <is410@cam.ac.uk>")
            .arg(Arg::with_name("dump-folder")
                     .help("Folder where to store the cluster CSV")
                     .required(true))
            .arg(Arg::with_name("address-file")
                     .long("address-file")
                     .required(true)
                     .takes_value(true)
                     .help("File with a list of transactions"))
            .arg(Arg::with_name("max-height")
                     .short("m")
                     .long("max-height")
                     .takes_value(true)
                     .help("Stop at a specified block height"))
    }

    fn new(matches: &ArgMatches) -> OpResult<Self>
        where Self: Sized
    {
        let ref dump_folder = PathBuf::from(matches.value_of("dump-folder").unwrap());
        let address_file = matches.value_of("address-file").unwrap();
        let max_height = value_t!(matches, "max-height", usize).unwrap_or(0);
        match (|| -> OpResult<Self> {
            let cb = TaintFifo {
                dump_folder: PathBuf::from(dump_folder),
                address_file: address_file.to_owned(),
                taint_mapping_writer:try!(TaintFifo::create_writer(dump_folder.join("taint_mapper.csv.tmp"))),
                address_info_writer: try!(TaintFifo::create_writer(dump_folder.join("address_info.csv.tmp"))),
                utxo_writer: try!(TaintFifo::create_writer(dump_folder.join("taint_utxo.csv.tmp"))),
                overlap_writer: try!(TaintFifo::create_writer(dump_folder.join("taint_overlap.csv.tmp"))),
                utxo_set: Default::default(),
                address_mapping: Default::default(),
                bootstrap_addresses: Default::default(),
                start_height: 0,
                end_height: 0,
                taint_collisions: 0,
                max_height: max_height,
                total_taint_for_tx: VecDeque::new(),
                whitename: String::from("Clean"),
                dirtmapper: HashMap::new(),
            };
            Ok(cb)
        })() {
            Ok(s) => return Ok(s),
            Err(e) => {
                Err(tag_err!(e,
                             "Couldn't initialize Clusterizer with folder: `{:?}`",
                             dump_folder.as_path()))
            }
        }
    }

    fn on_start(&mut self, _: CoinType, block_height: usize) {

        self.start_height = block_height;
        info!(target: "Clusterizer [on_start]", "Using `Clusterizer` with dump folder {:?} and start block {}...",&self.dump_folder, self.start_height);

        let path = Path::new(&self.address_file);

        self.dirtmapper.insert(self.whitename.clone(), 0); // We need to save the value of clean chunks
        let mut dirt_val: u16 = 1;             // The value for the newcoming chunk

        let file = File::open(&path).unwrap();
        for line in BufReader::new(file).lines() {
            let sline = line.unwrap();
            let mut spt   = sline.split(",");
            let addr  = spt.next().unwrap();

            if !self.bootstrap_addresses.contains_key(addr){
                debug!("Loading the transactions: {}", addr);

                let mut hmt: VecDeque<TaintPart> = VecDeque::new();         
                let mut tag_v = None;

                for s in spt{
                    if tag_v == None { tag_v = Some(s);}
                    else{
                        let tag = String::from(tag_v.unwrap());
                        if self.dirtmapper.contains_key(&tag){
                            hmt.push_back(TaintPart {name: *self.dirtmapper.get(&tag).unwrap(), value: s.parse::<u64>().unwrap()}); 
                        }else{
                            self.dirtmapper.insert(tag, dirt_val);
                            hmt.push_back(TaintPart {name: dirt_val, value: s.parse::<u64>().unwrap()}); 
                            dirt_val += 1;
                        }
                        tag_v = None;
                    }
                }
                self.bootstrap_addresses.insert(String::from(addr), hmt);
               }else{
                debug!("Address {} is already in the map. Duplicate detected!", addr);
            }
        }

        for (tag, mapto) in self.dirtmapper.iter() {
            self.taint_mapping_writer.write_all(format!("{},{}\n", tag, mapto.to_string()).as_bytes()).unwrap();
        }

    }

    fn on_block(&mut self, block: Block, block_height: usize) {

        if self.max_height > 0 && block_height >= self.max_height {
            debug!(target: "FIFO [on_block]", "Skipping block {} because max-height is set to {}.", block_height, self.max_height);
            return;
        }

        if (block_height % 1000) == 0 {
            let fragments = count_fragments(&self.address_mapping);
            let acc_num   = count_accounts(&self.address_mapping);
            info!(target: "FIFO [on_block]", "Progress: block {}, {} UTXOs, {} fragments on {} accounts, collisions: {}, tx left: {}",
                  block_height, self.utxo_set.len(), fragments, acc_num, self.taint_collisions, self.bootstrap_addresses.len());
        }
        debug!("NEW BLOCK HAS {} TRANSACTIONS", block.txs.len());

        let mut fees_summed        = 0;
        let mut all_inputs_summed  = 0;
        let mut all_outputs_summed = 0;

        let mut miner_output_queue: VecDeque<(TxOutpoint, &EvaluatedTxOut, u64)> = VecDeque::new();

        for tx in block.txs.iter(){
            // Finding the miners in here
            if tx.value.is_coinbase(){
                for (i, output) in tx.value.outputs.iter().enumerate(){
                    miner_output_queue.push_back((TxOutpoint{txid: tx.hash, index: i as u32}, &output, output.out.value));
                    let miner_outpoint = TxOutpoint {txid: tx.hash, index: i as u32};
                    self.utxo_set.insert(miner_outpoint, output.script.address.to_owned());
                }
            }
        }

        // The story is. There are actually two types of combination
        // First, is when we have user defined taint which is easy
        // Second, the miner one. We have to append taint to them and to do that we need to offset 
        // Them before combining. 
        let mut miner_offset_collector: HashMap<TxOutpoint, u64> = HashMap::new();

        for (tx_index, tx) in block.txs.iter().enumerate() {
            debug!("Tx: {}[I:{} O:{}]", arr_to_hex_swapped(&tx.hash), tx.value.inputs.len(), tx.value.outputs.len());
            if tx.value.is_coinbase(){continue;}

            if self.bootstrap_addresses.len() > 0{
                let h = &arr_to_hex_swapped(&tx.hash);
                let mut to_del = false;
                if self.bootstrap_addresses.contains_key(h){
                    let mut assigned_dirt = self.bootstrap_addresses.get_mut(h).unwrap();

                    if assigned_dirt.len() > 0{
                        for (i, output) in tx.value.outputs.iter().enumerate() {
                            let tx_outpoint = TxOutpoint{txid:tx.hash,index:i as u32};
                            let address = output.script.address.to_owned();
                            
                            assert!(!self.address_mapping.contains_key(&tx_outpoint));

                            let address_info = AddressInfo{
                                   timestamp: timestamp_to_date(block.header.value.timestamp as i64),
                                   current_balance: 0,
                                   tainted_balance: Some(extract_taint(assigned_dirt, output.out.value))
                            };  

                            assert_eq!(taint_to_sum(&address_info.tainted_balance), output.out.value); 
                            debug!("Loading taint for {} : {}", address, taint_to_string(&address_info.tainted_balance));

                            self.address_mapping.insert(tx_outpoint, address_info);
                        }
                    }
                    to_del = true;
                }
                if to_del{self.bootstrap_addresses.remove(h);}
            }

            trace!(target: "FIFO [on_block]", "Tx: {} ({}/{}).", arr_to_hex_swapped(&tx.hash), tx_index, block.txs.len());

            assert!(self.total_taint_for_tx.is_empty(), "A check to see that no taint is being lost from the previous transaction[{}]:{}", self.total_taint_for_tx.len(), taint_to_string(&Some(self.total_taint_for_tx.clone())));


            let mut outputs_summed = 0; // overall outputs value
            let mut inputs_summed  = 0;
            let mut miner_fee      = 0; // In here we calculate how much the miner gotten in the transaction

            for (i, output) in tx.value.outputs.iter().enumerate() {
                let tx_outpoint = TxOutpoint {txid: tx.hash, index: i as u32};
                let address = output.script.address.to_owned();
                self.utxo_set.insert(tx_outpoint, address);
                outputs_summed += output.out.value;
            }

            for (i, input) in tx.value.inputs.iter().enumerate() {
                let tx_outpoint = TxOutpoint {txid:input.outpoint.txid,index:input.outpoint.index};

                match self.address_mapping.get_mut(&tx_outpoint) {
                    Some(address_info)=>{
                        inputs_summed += address_info.current_balance;
                        debug!("\t{} INP: {} | BAL: {} | T: {} | SUM: {}", i, txo_to_string(&tx_outpoint, &self.utxo_set), address_info.current_balance, taint_to_string(&address_info.tainted_balance), inputs_summed);

                        let mut nullify = false;
                        if let Some(ref x) = address_info.tainted_balance{
                            // Push the taints if they exist
                            for tt in x.iter(){
                                assert!(tt.value != 0);
                                self.total_taint_for_tx.push_back(tt.to_owned());
                            }
                            nullify = true;
                        }else{
                            // No taint is found means that there is full White taint
                            // If the address has only white taint associated, that means
                            // that it is clean and we will not save this value at all to
                            // conserve space
                            
                            if address_info.current_balance > 0 {
                                self.total_taint_for_tx.push_back(TaintPart{name:0, value: address_info.current_balance});
                            }
                        }
                        if nullify {address_info.tainted_balance = None;}
                        address_info.current_balance = 0;
                    },
                    None=>{
                        assert!(false);
                    }
                };
            }

            let tx_inp_taint_sum = non_white_taint_to_sum(&self.total_taint_for_tx);
            let mut tx_out_taint_sum = 0;
            assert!(inputs_summed >= outputs_summed, "Sum of inp {}; Sum of out {}", inputs_summed, outputs_summed);
            miner_fee = inputs_summed - outputs_summed; 
            fees_summed += miner_fee;

            // The last value is the offset that needs to be appended to the taint.
            // We need to do this because of the way we do taint propagation to the miners
            let mut hul: Vec<(EvaluatedTxOut, TxOutpoint, u64)> = tx.value.outputs.iter().enumerate().map(|(ind, v)| {(v.clone(), TxOutpoint{txid: tx.hash, index: ind as u32}, 0)}).collect();

            if miner_fee > 0{
                let mut left_to_payoff = miner_fee; 
                while left_to_payoff > 0{
                    assert!(!miner_output_queue.is_empty(), "Oops, no more miners left to pay off, but we still need to pay off {}", left_to_payoff);
                    let mtup     = miner_output_queue.pop_front().unwrap();
                    let mut ctxo = mtup.0; // The TxOutpoint
                    let mut cout = mtup.1;  // The Output
                    let mut val  = mtup.2;
                    let mut etx  = None;

                    if val > left_to_payoff{
                        etx = Some(EvaluatedTxOut{script:cout.script.clone(), out:TxOutput{value: left_to_payoff, script_len: cout.out.script_len.clone(), script_pubkey: cout.out.script_pubkey.clone()}});
                        miner_output_queue.push_front((ctxo.clone(), cout, val-left_to_payoff));
                        left_to_payoff = 0;
                    }else{
                        etx = Some(EvaluatedTxOut{script: cout.script.clone(), out: TxOutput{value: val, script_len: cout.out.script_len.clone(), script_pubkey: cout.out.script_pubkey.clone()}});
                        left_to_payoff -= val;
                    }

                    if let Some(xxx)=etx{
                        let mut offset = 0;
                        if miner_offset_collector.contains_key(&ctxo){
                            offset += miner_offset_collector.get(&ctxo).unwrap();
                        }
                        hul.push((xxx.clone(), ctxo.clone(), offset));
                        miner_offset_collector.insert(ctxo, offset + xxx.out.value);
                    }
                }
            }

            for (output, tx_outpoint, taint_offset) in hul {

                let mut add_bal: u64 = 0;
                assert!(output.out.value <= (outputs_summed+miner_fee), "output.out.value <= outputs_summed+miner_fee | {}<={}", output.out.value, outputs_summed);

                let mut tainted_balance: VecDeque<TaintPart> = extract_taint(&mut self.total_taint_for_tx, output.out.value); 
                assert_eq!(taint_to_sum(&Some(tainted_balance.clone())), output.out.value); 

                match self.address_mapping.get_mut(&tx_outpoint){
                    Some(address_info)=>{
                        add_bal += address_info.current_balance;
                        assert_eq!(add_bal, taint_offset);

                        if let Some(ref mut x) = address_info.tainted_balance{
                            if taint_offset > 0{tainted_balance.push_front(TaintPart{name:0,value:taint_offset});}
                            self.taint_collisions += combine_taints(&mut tainted_balance, x, Some(&mut self.overlap_writer), &arr_to_hex_swapped(&tx.hash));
                        }else{
                            tainted_balance.push_front(TaintPart{name:0, value:add_bal});
                        }
                    },
                    None=>{}
                };
 
                reduce_taint(&mut tainted_balance); 

                let info = AddressInfo {
                    timestamp:timestamp_to_date(block.header.value.timestamp as i64),
                    current_balance: output.out.value + add_bal, 
                    tainted_balance: if !tainted_balance.is_empty(){Some(tainted_balance.clone())}else{None},
                };

                if taint_offset > 0{
                    debug!("\tMINER OUT: {} | VAL: {} | TO: {} | T: {}", output.script.address, output.out.value, taint_offset, taint_to_string(&info.tainted_balance));
                }else{
                    debug!("\t      OUT: {} | VAL: {} | TO: {} | T: {}", output.script.address, output.out.value, taint_offset, taint_to_string(&info.tainted_balance));
                    tx_out_taint_sum += non_white_taint_to_sum(&tainted_balance);
                }

                self.address_mapping.insert(tx_outpoint, info);
            }

            for mt in miner_offset_collector.iter(){
                let mut mtox = mt.0;
                
                match self.address_mapping.get(&mtox){
                    Some(address_info)=>{
                        if let Some(ref x) = address_info.tainted_balance{
                            tx_out_taint_sum += non_white_taint_to_sum(&x);
                        }
                    },
                    None=>{assert!(false);}
                };
            }

            assert!(tx_inp_taint_sum <= tx_out_taint_sum, "Sum(inp_taint) <= Sum(output_taint) | {} <= {}", tx_inp_taint_sum, tx_out_taint_sum);
            
            for input in &tx.value.inputs {
                let tx_outpoint=TxOutpoint{txid:input.outpoint.txid,index:input.outpoint.index};
                       self.utxo_set.remove(&tx_outpoint);
                self.address_mapping.remove(&tx_outpoint);
            }

            all_inputs_summed  += inputs_summed;
            all_outputs_summed += outputs_summed;
        }

        assert!((all_inputs_summed - all_outputs_summed - fees_summed) == 0);

        while !miner_output_queue.is_empty(){
            let mtup     = miner_output_queue.pop_front().unwrap();
            let mut ctxo = mtup.0; // The TxOutpoint
            let mut val  = mtup.2;

            let rew = val; 
            let mut found = false;

            match self.address_mapping.get_mut(&ctxo){
                Some(address_info) => {
                    address_info.current_balance += rew; 
                    let mut destroyme = false;

                    if address_info.tainted_balance != None{
                        assert_eq!(address_info.current_balance-rew, taint_to_sum(&address_info.tainted_balance));
                    }

                    if let Some(ref mut x) = address_info.tainted_balance{
                        x.push_back(TaintPart{name: 0, value: rew});
                        reduce_taint(x);
                        if x.is_empty(){
                            destroyme = true;
                        }
                    }

                    if destroyme{
                        address_info.tainted_balance = None;
                    }
                    debug!("Miner found {} has new balance of {}", txo_to_string(&ctxo, &self.utxo_set), address_info.current_balance);
                     
                    found = true;
                },
                None=>{}
            };

            if !found{
                let info = AddressInfo {
                    timestamp:timestamp_to_date(block.header.value.timestamp as i64),
                    current_balance: rew, 
                    tainted_balance: None, 
                };

                debug!("Miner not found {} has new balance of {}", txo_to_string(&ctxo, &self.utxo_set), info.current_balance);

                self.address_mapping.insert(ctxo, info); 
            }
        }

        assert!(self.total_taint_for_tx.is_empty());
        debug!("BLOCK END");
    }

    fn on_complete(&mut self, block_height: usize) {
        self.end_height = block_height;

        let _ = self.export_clusters_to_csv();
        let _ = self.export_utxo_set_to_csv();
        let _ = self.rename_tmp_files();
        info!(target: "FIFO [on_complete]", "Done.\nProcessed all {} blocks\n",
             self.end_height + 1);
    }
}

fn timestamp_to_date(timestamp: i64) -> String {
    let naive_datetime = NaiveDateTime::from_timestamp(timestamp, 0);
    let datetime_again: DateTime<Utc> = DateTime::from_utc(naive_datetime, Utc);
    return datetime_again.format("%Y%m%d-%H%M%S").to_string()
}


